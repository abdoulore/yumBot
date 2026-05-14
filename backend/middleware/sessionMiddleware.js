import { v4 as uuidv4 } from "uuid";
import Session from "../models/Session.js";

export const sessionMiddleware = async (req, res, next) => {
  try {
    let sessionId = req.cookies.foodie_session;

    if (!sessionId) {
      sessionId = uuidv4();

      res.cookie("foodie_session", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30
      });

      await Session.create({ sessionId });
    } else {
      const existingSession = await Session.findOne({ sessionId });

      if (!existingSession) {
        await Session.create({ sessionId });
      }
    }

    req.sessionId = sessionId;
    next();
  } catch (error) {
    next(error);
  }
};