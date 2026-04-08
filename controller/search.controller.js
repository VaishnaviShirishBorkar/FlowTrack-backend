import Project from '../models/Project.js';
import Task from '../models/Task.js';

export const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(200).json({ projects: [], tasks: [] });
        }

        const searchRegex = new RegExp(q.trim(), 'i');
        const userId = req.user._id;

        // Find projects the user has access to that match the search
        const projects = await Project.find({
            $and: [
                { $or: [{ owner: userId }, { members: userId }] },
                { $or: [{ name: searchRegex }, { description: searchRegex }] }
            ]
        })
            .populate('owner', 'name email')
            .limit(10);

        // Get all project IDs the user has access to
        const accessibleProjects = await Project.find({
            $or: [{ owner: userId }, { members: userId }]
        }, '_id');
        const projectIds = accessibleProjects.map(p => p._id);

        // Search tasks within accessible projects
        const tasks = await Task.find({
            project: { $in: projectIds },
            $or: [{ title: searchRegex }, { description: searchRegex }]
        })
            .populate('project', 'name')
            .populate('assignedTo', 'name email')
            .limit(15);

        res.status(200).json({ projects, tasks });
    } catch (error) {
        console.error("Error in global search:", error);
        res.status(500).json({ message: "Server error" });
    }
};
