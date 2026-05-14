import express from "express";
import { menuItems } from "../data/menu.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ menu: menuItems });
});

export default router;