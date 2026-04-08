import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { searchUsers, getProfile, updateProfile } from "../controller/user.controller.js";

const router = express.Router();

router.get("/search", verifyToken, searchUsers);
router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);

export default router;

