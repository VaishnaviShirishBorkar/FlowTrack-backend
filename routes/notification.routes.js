import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
} from '../controller/notification.controller.js';

const router = express.Router();

router.get('/', verifyToken, getNotifications);
router.get('/unread-count', verifyToken, getUnreadCount);
router.put('/mark-all-read', verifyToken, markAllAsRead);
router.put('/:id/read', verifyToken, markAsRead);

export default router;
