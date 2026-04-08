import Activity from '../models/Activity.js';

export const getActivities = async (req, res) => {
    try {
        const { projectId } = req.params;

        const activities = await Activity.find({ project: projectId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 }) // newest first
            .limit(50);

        res.status(200).json(activities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Helper to create activity and emit via Socket.IO
export const logActivity = async (io, { action, userId, userName, projectId, details }) => {
    try {
        const activity = new Activity({
            action,
            user: userId,
            project: projectId,
            details
        });

        console.log('activity ', activity);

        await activity.save();

        const populatedActivity = await Activity.findById(activity._id)
            .populate('user', 'name email');

        io.to(`project-${projectId}`).emit('new-activity', populatedActivity);

        return populatedActivity;
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};
