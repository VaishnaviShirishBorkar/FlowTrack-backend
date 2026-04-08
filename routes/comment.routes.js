import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { createComment, getComments } from '../controller/comment.controller.js';

const router = express.Router();

router.post('/', verifyToken, createComment);
router.get('/task/:taskId', verifyToken, getComments);

export default router;
