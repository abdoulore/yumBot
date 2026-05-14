import express from "express";
import { handleChat } from "../controllers/chatController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = express.Router();

router.post("/", sessionMiddleware, handleChat);

export default router;