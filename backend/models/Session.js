import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  }
}, { timestamps: true });

export default mongoose.model("Session", sessionSchema);