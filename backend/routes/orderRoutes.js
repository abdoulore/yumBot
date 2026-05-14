import express from "express";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import {
  addItemToOrder,
  getCurrentOrder,
  getOrderHistory,
  cancelOrder,
  checkoutOrder
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/add", sessionMiddleware, addItemToOrder);
router.get("/current", sessionMiddleware, getCurrentOrder);
router.get("/history", sessionMiddleware, getOrderHistory);
router.post("/cancel", sessionMiddleware, cancelOrder);
router.post("/checkout", sessionMiddleware, checkoutOrder);

export default router;