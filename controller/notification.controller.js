import Notification from '../models/Notification.js';

// Get notifications for the logged-in user
export const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate('project', 'name')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });
        res.status(200).json({ count });
    } catch (error) {
        console.error("Error fetching unread count:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Mark a single notification as read
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json(notification);
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all as read:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Helper: create a notification and push via WebSocket
export const createNotification = async (io, { recipientId, type, title, message, projectId, taskId }) => {
    try {
        // Don't notify yourself
        if (!recipientId) return null;

        const notification = new Notification({
            recipient: recipientId,
            type,
            title,
            message,
            project: projectId || undefined,
            task: taskId || undefined
        });

        await notification.save();

        const populated = await Notification.findById(notification._id)
            .populate('project', 'name');

        // Push to user's personal socket room
        io.to(`user-${recipientId}`).emit('new-notification', populated);

        return populated;
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};
