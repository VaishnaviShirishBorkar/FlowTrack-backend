import Task from '../models/Task.js';
import Project from '../models/Project.js';

export const createTask = async (req, res) => {
    try {
        const { title, description, projectId, priority, dueDate, assignee, assignedTo } = req.body;

        const project = await Project.findById(projectId);
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Check if user is member or owner
        const isMember = project.members.some(m => m.equals(req.user._id));
        const isOwner = project.owner.equals(req.user._id);

        if (!isMember && !isOwner && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const task = new Task({
            title,
            description,
            project: projectId,
            priority,
            dueDate,
            assignee,
            assignedTo,
            status: 'todo' // Default status
        });

        await task.save();
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

        const tasks = await Task.find({ project: projectId })
            .populate('assignee', 'name email')
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

        // Check permissions (Member can update status/assignee? Leader can update everything?)
        // For simplicity, allow members to update tasks they are part of the project of
        const project = task.project;
        if (!project) return res.status(404).json({ message: "Project context missing" });

        const isMember = project.members.some(m => m.equals(req.user._id));
        const isOwner = project.owner.equals(req.user._id);

        if (!isMember && !isOwner && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const updatedTask = await Task.findByIdAndUpdate(taskId, updates, { new: true })
            .populate('assignee', 'name email');

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

        await Task.findByIdAndDelete(taskId);
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
