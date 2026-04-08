import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import { createNotification } from './notification.controller.js';

export const createComment = async (req, res) => {
    try {
        const { text, taskId } = req.body;

        if (!text || !taskId) {
            return res.status(400).json({ message: "Text and taskId are required" });
        }

        const task = await Task.findById(taskId).populate('project');
        if (!task) return res.status(404).json({ message: "Task not found" });

        const comment = new Comment({
            text,
            task: taskId,
            user: req.user._id
        });

        await comment.save();

        // Populate user info for the response
        const populatedComment = await Comment.findById(comment._id)
            .populate('user', 'name email');

        // Log activity
        const activity = new Activity({
            action: 'added_comment',
            user: req.user._id,
            project: task.project._id || task.project,
            details: `${req.user.name} commented on "${task.title}"`
        });
        await activity.save();

        // Emit real-time events via Socket.IO
        const io = req.app.get('io');
        const projectId = task.project._id || task.project;

        // Emit new comment to task room
        io.to(`project-${projectId}`).emit('new-comment', {
            comment: populatedComment,
            taskId
        });

        // Emit activity to project room
        const populatedActivity = await Activity.findById(activity._id)
            .populate('user', 'name email');
        io.to(`project-${projectId}`).emit('new-activity', populatedActivity);

        res.status(201).json(populatedComment);

        // Notify task assignee about the comment (after responding)
        const assigneeId = task.assignedTo;
        if (assigneeId && assigneeId.toString() !== req.user._id.toString()) {
            await createNotification(io, {
                recipientId: assigneeId,
                type: 'comment_added',
                title: 'New Comment',
                message: `${req.user.name} commented on "${task.title}"`,
                projectId,
                taskId
            });
        }
    } catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getComments = async (req, res) => {
    try {
        const { taskId } = req.params;

        const comments = await Comment.find({ task: taskId })
            .populate('user', 'name email')
            .sort({ createdAt: 1 }); // oldest first

        res.status(200).json(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Server error" });
    }
};
