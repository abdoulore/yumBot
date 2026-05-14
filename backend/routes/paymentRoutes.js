import express from "express";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import {
  initializePayment,
  verifyPayment
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/init", sessionMiddleware, initializePayment);
router.get("/verify", sessionMiddleware, verifyPayment);

export default router;