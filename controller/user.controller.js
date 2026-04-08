import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ message: "Query required" });

        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
            ],
        }).select("name email role _id");

        res.json(users);
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        // Get counts
        const Project = (await import('../models/Project.js')).default;
        const Task = (await import('../models/Task.js')).default;

        const projectCount = await Project.countDocuments({
            $or: [{ owner: user._id }, { members: user._id }]
        });
        const taskCount = await Task.countDocuments({ assignedTo: user._id });
        const completedTaskCount = await Task.countDocuments({ assignedTo: user._id, status: 'done' });

        res.json({
            ...user.toObject(),
            projectCount,
            taskCount,
            completedTaskCount
        });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { name, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update name if provided
        if (name && name.trim()) {
            user.name = name.trim();
        }

        // Update password if provided
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password required" });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();

        const updatedUser = user.toObject();
        delete updatedUser.password;

        res.json(updatedUser);
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

