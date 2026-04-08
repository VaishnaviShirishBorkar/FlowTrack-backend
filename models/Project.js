import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    memberRoles: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            role: {
                type: String,
                enum: ['Team Leader', 'Team Member'],
                default: 'Team Member'
            }
        }
    ],
    startDate: Date,
    endDate: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Project', projectSchema);
