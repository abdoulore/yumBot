import { v4 as uuidv4 } from "uuid";
import Session from "../models/Session.js";

export const sessionMiddleware = async (req, res, next) => {
  try {
    let sessionId = req.cookies.foodie_session;

    if (!sessionId) {
      sessionId = uuidv4();

      res.cookie("foodie_session", sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 30
      });
    }

    let session = await Session.findOne({ sessionId });

    if (!session) {
      session = await Session.create({
        sessionId,
        stage: "main"
      });
    }

    req.sessionId = sessionId;
    req.userSession = session;

    next();
  } catch (error) {
    next(error);
  }
};