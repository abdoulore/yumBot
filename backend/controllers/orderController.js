import Order from "../models/Order.js";
import { menuItems } from "../data/menu.js";

const getPendingOrder = async (sessionId) => {
  let order = await Order.findOne({ sessionId, status: "pending" });

  if (!order) {
    order = await Order.create({
      sessionId,
      items: [],
      total: 0,
      status: "pending"
    });
  }

  return order;
};

export const addItemToOrder = async (req, res) => {
  try {
    const { menuItemId, quantity = 1, selectedOptions = {} } = req.body;

    const item = menuItems.find((food) => food.id === Number(menuItemId));

    if (!item) {
      return res.status(400).json({ message: "Invalid menu item" });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const order = await getPendingOrder(req.sessionId);

    order.items.push({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      selectedOptions
    });

    order.total = order.items.reduce((sum, food) => {
      return sum + food.price * food.quantity;
    }, 0);

    await order.save();

    res.json({
      message: `${item.name} added to order`,
      order
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to add item" });
  }
};

export const getCurrentOrder = async (req, res) => {
  const order = await Order.findOne({
    sessionId: req.sessionId,
    status: "pending"
  });

  if (!order || order.items.length === 0) {
    return res.json({ message: "Your current order is empty", order: null });
  }

  res.json({ order });
};

export const getOrderHistory = async (req, res) => {
  const orders = await Order.find({
    sessionId: req.sessionId,
    status: { $in: ["paid", "cancelled"] }
  }).sort({ createdAt: -1 });

  res.json({ orders });
};

export const cancelOrder = async (req, res) => {
  const order = await Order.findOne({
    sessionId: req.sessionId,
    status: "pending"
  });

  if (!order || order.items.length === 0) {
    return res.json({ message: "No current order to cancel" });
  }

  order.status = "cancelled";
  await order.save();

  res.json({ message: "Order cancelled" });
};

export const checkoutOrder = async (req, res) => {
  const { deliveryType = "immediate", scheduledTime } = req.body;

  const order = await Order.findOne({
    sessionId: req.sessionId,
    status: "pending"
  });

  if (!order || order.items.length === 0) {
    return res.json({ message: "No order to place", order: null });
  }

  order.deliveryType = deliveryType;

  if (deliveryType === "scheduled") {
    if (!scheduledTime) {
      return res.status(400).json({
        message: "Scheduled time is required"
      });
    }

    order.scheduledTime = scheduledTime;
  }

  await order.save();

  res.json({
    message: "Order placed. Please proceed to payment.",
    order
  });
};