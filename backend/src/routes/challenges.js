import express from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  ChallengeError,
  getChallengeProgress,
  getKoreanToday,
  getOrCreateWeeklyChallenges,
  getWeeklyProgress,
  verifyChallenge,
} from "../services/challengeService.js";
import { AiChallenge, ExpenseCategory } from "../models/index.js";

const router = express.Router();
const weekdayLabels = ["월", "화", "수", "목", "금"];

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toChallengeResponse(challenge, currentDate) {
  const date = challenge.challenge_date;
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return {
    id: Number(challenge.id),
    date,
    weekday: weekdayLabels[Math.max(0, day - 1)] || "",
    title: challenge.title,
    description: challenge.description,
    category: challenge.ExpenseCategory?.name || null,
    challengeType: challenge.challenge_type,
    targetAmount: challenge.target_amount === null ? null : Number(challenge.target_amount),
    estimatedSavingAmount: Number(challenge.estimated_saving_amount || 0),
    point: Number(challenge.point || 0),
    status: challenge.status,
    canVerify: challenge.challenge_date === addDays(currentDate, -1) && challenge.status === "IN_PROGRESS",
    verificationOpensAt: `${addDays(challenge.challenge_date, 1)}T00:00:00+09:00`,
  };
}

router.get("/me/challenges", requireAuth, async (req, res) => {
  const referenceDate = req.query.week || getKoreanToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return res.status(400).json({ message: "week은 YYYY-MM-DD 형식이어야 합니다." });
  }

  try {
    const result = await getOrCreateWeeklyChallenges(req.user.id, referenceDate);
    const weeklyChallenges = result.challenges.map((challenge) => toChallengeResponse(challenge, result.currentDate));
    const todayChallenge = weeklyChallenges.find((challenge) => challenge.date === result.currentDate) || null;
    const currentChallenge = result.challenges.find((challenge) => challenge.challenge_date === result.currentDate);
    if (todayChallenge && currentChallenge) {
      todayChallenge.progress = await getChallengeProgress(req.user.id, currentChallenge);
    }

    return res.status(200).json({
      weekStartDate: result.weekStart,
      today: result.currentDate,
      onboardingRequired: result.onboardingRequired,
      generated: result.challenges.length === 5,
      todayChallenge,
      weeklyChallenges,
      weeklyProgress: getWeeklyProgress(result.challenges),
    });
  } catch (error) {
    console.error("Weekly AI challenge query failed:", error);
    return res.status(502).json({ message: "AI 챌린지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." });
  }
});

router.get("/me/challenges/:challengeId/progress", requireAuth, async (req, res) => {
  const challengeId = Number(req.params.challengeId);
  if (!Number.isInteger(challengeId) || challengeId <= 0) {
    return res.status(400).json({ message: "올바른 챌린지 ID가 필요합니다." });
  }
  const challenge = await AiChallenge.findOne({
    where: { id: challengeId, user_id: req.user.id },
    include: [{ model: ExpenseCategory, attributes: ["id", "name"] }],
  });
  if (!challenge) return res.status(404).json({ message: "챌린지를 찾을 수 없습니다." });
  return res.status(200).json(await getChallengeProgress(req.user.id, challenge));
});

router.post("/me/challenges/:challengeId/verify", requireAuth, async (req, res) => {
  const challengeId = Number(req.params.challengeId);
  if (!Number.isInteger(challengeId) || challengeId <= 0) {
    return res.status(400).json({ message: "올바른 챌린지 ID가 필요합니다." });
  }
  try {
    const { challenge } = await verifyChallenge(req.user.id, challengeId);
    return res.status(200).json({
      challengeId: Number(challenge.id),
      status: challenge.status,
      message: challenge.status === "SUCCESS"
        ? `미션 성공! ${Number(challenge.point)}P를 받았어요.`
        : "미션 조건을 달성하지 못해 미완료 처리됐어요.",
    });
  } catch (error) {
    if (error instanceof ChallengeError) {
      return res.status(error.status).json({ message: error.message, code: error.code, details: error.details });
    }
    console.error("Challenge verification failed:", error);
    return res.status(500).json({ message: "챌린지 인증 처리 중 오류가 발생했습니다." });
  }
});

export default router;
