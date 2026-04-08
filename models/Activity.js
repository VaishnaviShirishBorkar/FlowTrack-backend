import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['created_task', 'updated_task', 'moved_task', 'deleted_task', 'added_comment', 'added_member']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    details: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Activity', activitySchema);
