import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { globalSearch } from '../controller/search.controller.js';

const router = express.Router();

router.get('/', verifyToken, globalSearch);

export default router;
