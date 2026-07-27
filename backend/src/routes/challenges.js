import express from "express";

import { requireAuth } from "../middleware/auth.js";
import { getKoreanToday, getOrCreateWeeklyChallenges } from "../services/challengeService.js";

const router = express.Router();
const weekdayLabels = ["월", "화", "수", "목", "금"];

function toChallengeResponse(challenge) {
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
  };
}

router.get("/me/challenges", requireAuth, async (req, res) => {
  const referenceDate = req.query.week || getKoreanToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return res.status(400).json({ message: "week은 YYYY-MM-DD 형식이어야 합니다." });
  }

  try {
    const result = await getOrCreateWeeklyChallenges(req.user.id, referenceDate);
    const weeklyChallenges = result.challenges.map(toChallengeResponse);
    const todayChallenge = weeklyChallenges.find((challenge) => challenge.date === result.currentDate) || null;

    return res.status(200).json({
      weekStartDate: result.weekStart,
      today: result.currentDate,
      onboardingRequired: result.onboardingRequired,
      generated: result.challenges.length === 5,
      todayChallenge,
      weeklyChallenges,
    });
  } catch (error) {
    console.error("Weekly AI challenge query failed:", error);
    return res.status(502).json({ message: "AI 챌린지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요." });
  }
});

export default router;
