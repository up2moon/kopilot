import { User } from "../models/index.js";
import { verifyAccessToken } from "../services/tokens.js";

export async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [tokenType, accessToken] = authorization.split(" ");

    if (tokenType !== "Bearer" || !accessToken) {
      return res.status(401).json({
        message: "인증이 필요합니다.",
      });
    }

    const payload = verifyAccessToken(accessToken);
    const user = await User.findByPk(payload.sub);

    if (!user) {
      return res.status(401).json({
        message: "인증이 필요합니다.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "인증이 필요합니다.",
    });
  }
}
