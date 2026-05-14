import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  stage: {
    type: String,
    default: "main"
  }
}, { timestamps: true });

export default mongoose.model("Session", sessionSchema);