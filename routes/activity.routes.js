import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { getActivities } from '../controller/activity.controller.js';

const router = express.Router();

router.get('/project/:projectId', verifyToken, getActivities);

export default router;
