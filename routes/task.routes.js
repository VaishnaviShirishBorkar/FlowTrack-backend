import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware.js';
import {
    createTask,
    getTasks,
    updateTask,
    deleteTask,
    getDashboardStats
} from '../controller/task.controller.js';

const router = express.Router();

router.get('/dashboard', verifyToken, getDashboardStats);


// Create a task (Team Leader, Admin, or Member?) - Plan said Team Leader.
// But usually members create tasks too. I'll allow members for flexibility or restrict to Leader as per user implications?
// User said "Team Member... Can only see projects... tasks assigned to them".
// "Team Leader... create projects...".
// I will restrict Task Creation to Team Leader/Admin for now to be safe, or allow Project Members.
// Let's allow Project Members to create tasks for collaboration, but maybe user implied strict hierarchy.
// "Team Member... Can only see tasks assigned to them (or project tasks)"
// I will stick to Project Member access for creating/updating, effectively ANY member of the project.
router.post(
    '/',
    verifyToken,
    createTask
);

// Get tasks for a project
router.get(
    '/project/:projectId',
    verifyToken,
    getTasks
);

router.put(
    '/:taskId',
    verifyToken,
    updateTask
);

router.delete(
    '/:taskId',
    verifyToken,
    deleteTask
);

export default router;
