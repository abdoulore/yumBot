import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  menuItemId: Number,
  name: String,
  price: Number,
  quantity: {
    type: Number,
    default: 1
  },
  selectedOptions: Object
});

const orderSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  total: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["pending", "paid", "cancelled"],
    default: "pending"
  },
  deliveryType: {
    type: String,
    enum: ["immediate", "scheduled"],
    default: "immediate"
  },
  scheduledTime: String,
  paymentReference: String
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);