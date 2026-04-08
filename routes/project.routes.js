import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.middleware.js';
import {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    removeMember
} from '../controller/project.controller.js';

const router = express.Router();

router.post(
    '/',
    verifyToken,
    authorizeRoles('Admin', 'Team Leader'),
    createProject
);

router.get(
    '/',
    verifyToken,
    getProjects
);

router.get(
    '/:id',
    verifyToken,
    getProjectById
);

router.put(
    '/:id',
    verifyToken,
    authorizeRoles('Admin', 'Team Leader'),
    updateProject
);

router.delete(
    '/:id',
    verifyToken,
    authorizeRoles('Admin', 'Team Leader'),
    deleteProject
);

router.post(
    '/:id/members',
    verifyToken,
    authorizeRoles('Admin', 'Team Leader'),
    addMember
);

router.delete(
    '/:id/members',
    verifyToken,
    authorizeRoles('Admin', 'Team Leader'),
    removeMember
);

export default router;
