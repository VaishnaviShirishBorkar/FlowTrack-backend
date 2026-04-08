import Task from '../models/Task.js';
import Project from '../models/Project.js';
import { logActivity } from './activity.controller.js';
import { createNotification } from './notification.controller.js';

const getProjectRole = (project, userId, globalRole) => {
    if (globalRole === 'Admin') return 'Admin';

    const ownerId = (project.owner?._id || project.owner)?.toString();
    if (ownerId === userId.toString()) return 'Team Leader';

    const projectRole = (project.memberRoles || []).find(
        (entry) => entry.user?.toString() === userId.toString()
    )?.role;

    return projectRole || 'Team Member';
};

export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const role = req.user.role;

        let projects;
        if (role === 'Admin') {
            projects = await Project.find({}).populate('members', 'name');
        } else {
            projects = await Project.find({
                $or: [{ owner: userId }, { members: userId }]
            }).populate('members', 'name');
        }

        const projectIds = projects.map(p => p._id);

        const taskQuery = { project: { $in: projectIds } };
        if (role === 'Team Member') {
            taskQuery.assignedTo = userId;
        }

        const tasks = await Task.find(taskQuery)
            .populate('assignedTo', 'name email')
            .populate('project', 'name');

        const now = new Date();

        const stats = {
            totalTasks: tasks.length,
            totalProjects: projects.length,
            byPriority: {
                urgent: tasks.filter(t => t.priority === 'urgent').length,
                high: tasks.filter(t => t.priority === 'high').length,
                medium: tasks.filter(t => t.priority === 'medium').length,
                low: tasks.filter(t => t.priority === 'low').length,
            },
            byStatus: {
                todo: tasks.filter(t => t.status === 'todo').length,
                in_progress: tasks.filter(t => t.status === 'in_progress').length,
                review: tasks.filter(t => t.status === 'review').length,
                done: tasks.filter(t => t.status === 'done').length,
            },
            overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length,
            completionRate: tasks.length > 0
                ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
                : 0,
        };

        // Per-project breakdown
        const projectBreakdown = projects.map(p => {
            const projTasks = tasks.filter(t =>
                (t.project?._id || t.project)?.toString() === p._id.toString()
            );
            return {
                name: p.name,
                _id: p._id,
                memberCount: p.members?.length || 0,
                total: projTasks.length,
                done: projTasks.filter(t => t.status === 'done').length,
                todo: projTasks.filter(t => t.status === 'todo').length,
                in_progress: projTasks.filter(t => t.status === 'in_progress').length,
                review: projTasks.filter(t => t.status === 'review').length,
            };
        });

        // Recent tasks assigned to user
        const myTasks = await Task.find({
            assignedTo: userId,
            project: { $in: projectIds }
        })
            .sort({ dueDate: 1 })
            .limit(5)
            .populate('project', 'name');

        // Upcoming deadlines (next 7 days)
        const upcomingDeadlines = tasks
            .filter(t => t.dueDate && new Date(t.dueDate) >= now && t.status !== 'done')
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 6);

        res.json({ stats, myTasks, projectBreakdown, upcomingDeadlines });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ message: "Server error" });
    }
};


export const createTask = async (req, res) => {
    try {
        const { title, description, projectId, priority, dueDate, assignedTo } = req.body;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Check if user is member or owner
        const isMember = project.members.some(m => m.equals(req.user._id));
        const isOwner = project.owner.equals(req.user._id);

        if (!isMember && !isOwner && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const projectRole = getProjectRole(project, req.user._id, req.user.role);
        if (projectRole === 'Team Member') {
            return res.status(403).json({ message: "Team Members cannot create tasks" });
        }

        const task = new Task({
            title,
            description,
            project: projectId,
            priority,
            dueDate,
            assignedTo,
            status: 'todo' // Default status
        });

        await task.save();

        // Log activity
        const io = req.app.get('io');
        await logActivity(io, {
            action: 'created_task',
            userId: req.user._id,
            userName: req.user.name,
            projectId,
            details: `${req.user.name} created task "${title}"`
        });

        // Notify assignee
        if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
            await createNotification(io, {
                recipientId: assignedTo,
                type: 'task_assigned',
                title: 'New Task Assigned',
                message: `${req.user.name} assigned you the task "${title}"`,
                projectId,
                taskId: task._id
            });
        }

        res.status(201).json(task);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Check authentication
        const isMember = project.members.some(m => m.equals(req.user._id));
        const isOwner = project.owner.equals(req.user._id);

        if (!isMember && !isOwner && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const taskQuery = { project: projectId };
        const projectRole = getProjectRole(project, req.user._id, req.user.role);
        if (projectRole === 'Team Member') {
            taskQuery.assignedTo = req.user._id;
        }

        const tasks = await Task.find(taskQuery)
            .populate('assignedTo', 'name email')
            .populate('project', 'name');

        res.status(200).json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const updates = req.body;

        const task = await Task.findById(taskId).populate('project');
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Check permissions
        const project = task.project;
        if (!project) return res.status(404).json({ message: "Project context missing" });

        const isMember = project.members.some(m => m.equals(req.user._id));
        const isOwner = project.owner.equals(req.user._id);

        if (!isMember && !isOwner && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const projectRole = getProjectRole(project, req.user._id, req.user.role);
        if (projectRole === 'Team Member') {
            const allowedKeys = ['status'];
            const updateKeys = Object.keys(updates);
            const isOnlyStatusUpdate = updateKeys.length > 0 && updateKeys.every((key) => allowedKeys.includes(key));
            const assigneeId = (task.assignedTo?._id || task.assignedTo)?.toString();
            const isAssignedToCurrentUser = assigneeId === req.user._id.toString();

            if (!isOnlyStatusUpdate || !isAssignedToCurrentUser) {
                return res.status(403).json({ message: "Team Members can only move their own assigned tasks" });
            }
        }

        const oldStatus = task.status;
        const updatedTask = await Task.findByIdAndUpdate(taskId, updates, { new: true })
            .populate('assignedTo', 'name email');

        // Log activity for status changes
        const io = req.app.get('io');
        const projectId = project._id;

        if (updates.status && updates.status !== oldStatus) {
            const statusNames = {
                todo: 'To Do',
                in_progress: 'In Progress',
                review: 'Under Review',
                done: 'Completed'
            };
            await logActivity(io, {
                action: 'moved_task',
                userId: req.user._id,
                userName: req.user.name,
                projectId,
                details: `${req.user.name} moved "${task.title}" from ${statusNames[oldStatus] || oldStatus} to ${statusNames[updates.status] || updates.status}`
            });

            // Notify assignee about status change
            const assigneeId = updatedTask.assignedTo?._id || updatedTask.assignedTo;
            if (assigneeId && assigneeId.toString() !== req.user._id.toString()) {
                await createNotification(io, {
                    recipientId: assigneeId,
                    type: 'task_status_changed',
                    title: 'Task Status Updated',
                    message: `${req.user.name} moved "${task.title}" to ${statusNames[updates.status] || updates.status}`,
                    projectId,
                    taskId: task._id
                });
            }
        } else {
            await logActivity(io, {
                action: 'updated_task',
                userId: req.user._id,
                userName: req.user.name,
                projectId,
                details: `${req.user.name} updated task "${task.title}"`
            });

            // Notify assignee about task update
            const assigneeId = updatedTask.assignedTo?._id || updatedTask.assignedTo;
            if (assigneeId && assigneeId.toString() !== req.user._id.toString()) {
                await createNotification(io, {
                    recipientId: assigneeId,
                    type: 'task_updated',
                    title: 'Task Updated',
                    message: `${req.user.name} updated task "${task.title}"`,
                    projectId,
                    taskId: task._id
                });
            }
        }

        res.status(200).json(updatedTask);
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId).populate('project');
        if (!task) return res.status(404).json({ message: "Task not found" });

        const project = task.project;
        const isOwner = project.owner.equals(req.user._id);

        if (!isOwner && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Only project owner/admin can delete tasks" });
        }

        const io = req.app.get('io');
        await logActivity(io, {
            action: 'deleted_task',
            userId: req.user._id,
            userName: req.user.name,
            projectId: project._id,
            details: `${req.user.name} deleted task "${task.title}"`
        });

        // Cascade delete associated comments and notifications
        const Comment = (await import('../models/Comment.js')).default;
        const Notification = (await import('../models/Notification.js')).default;
        await Comment.deleteMany({ task: taskId });
        await Notification.deleteMany({ task: taskId });

        await Task.findByIdAndDelete(taskId);
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Server error" });
    }
};

