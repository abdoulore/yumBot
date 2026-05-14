import axios from "axios";
import Order from "../models/Order.js";

export const initializePayment = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required for payment" });
    }

    const order = await Order.findOne({
      sessionId: req.sessionId,
      status: "pending"
    });

    if (!order || order.items.length === 0) {
      return res.status(400).json({ message: "No pending order found" });
    }

    const reference = `foodie_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: order.total * 100,
        reference,
        callback_url: `${process.env.FRONTEND_URL}/payment/verify?reference=${reference}`
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    order.paymentReference = reference;
    await order.save();

    res.json({
      authorizationUrl: response.data.data.authorization_url,
      reference
    });

  } catch (error) {
    res.status(500).json({
      message: "Payment initialization failed"
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const paymentData = response.data.data;

    if (paymentData.status !== "success") {
      return res.status(400).json({
        message: "Payment not successful",
        status: paymentData.status
      });
    }

    const order = await Order.findOne({
      sessionId: req.sessionId,
      paymentReference: reference
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "paid";
    await order.save();

    res.json({
      message: "Payment successful. Your order is confirmed.",
      order
    });

  } catch (error) {
    res.status(500).json({
      message: "Payment verification failed"
    });
  }
};