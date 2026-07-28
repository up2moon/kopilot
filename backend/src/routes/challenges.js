import express from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  ChallengeError,
  buildMissionContent,
  getChallengeClockInfo,
  getKoreanToday,
  getOrCreateWeeklyChallenges,
  getWeeklyCurrentStats,
  getWeeklyProgress,
  verifyWeeklyChallenges,
} from "../services/challengeService.js";

const router = express.Router();

function toChallengeResponse(challenge, currentStats) {
  return {
    id: Number(challenge.id),
    sequence: Number(challenge.sequence),
    category: challenge.ExpenseCategory?.name || null,
    content: challenge.baseline_period_start
      ? buildMissionContent(challenge)
      : challenge.description || challenge.title,
    challengeType: challenge.challenge_type,
    baselinePeriodStart: challenge.baseline_period_start,
    baselinePeriodEnd: challenge.baseline_period_end,
    baselineCount: Number(challenge.baseline_count || 0),
    baselineAmount: Number(challenge.baseline_amount || 0),
    targetCount: challenge.target_count === null ? null : Number(challenge.target_count),
    targetAmount: challenge.target_amount === null ? null : Number(challenge.target_amount),
    currentCount: currentStats?.transactionCount || 0,
    currentSpentAmount: currentStats?.spentAmount || 0,
    estimatedSavingAmount: Number(challenge.estimated_saving_amount || 0),
    point: Number(challenge.point || 0),
    status: challenge.status,
  };
}

function sendChallengeError(res, error) {
  return res.status(error.status).json({
    message: error.message,
    code: error.code,
    details: error.details,
  });
}

router.get("/me/challenges", requireAuth, async (req, res) => {
  const referenceDate = req.query.week || getKoreanToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return res.status(400).json({ message: "week은 YYYY-MM-DD 형식이어야 합니다." });
  }

  try {
    const result = await getOrCreateWeeklyChallenges(req.user.id, referenceDate);
    const progress = getWeeklyProgress(result.challenges);
    const currentStats = await getWeeklyCurrentStats(
      req.user.id,
      result.weekStart,
      result.challenges,
    );
    return res.status(200).json({
      weekStartDate: result.weekStart,
      weekEndDate: result.weekEnd,
      today: result.currentDate,
      clock: getChallengeClockInfo(),
      verificationOpensAt: result.verificationOpensAt,
      verificationClosesAt: result.verificationClosesAt,
      canVerify: result.canVerify,
      onboardingRequired: result.onboardingRequired,
      generated: result.challenges.length === 5,
      successfulCount: progress.successCount,
      totalCount: progress.totalCount,
      weeklyChallenges: result.challenges.map((challenge) => (
        toChallengeResponse(challenge, currentStats.get(Number(challenge.id)))
      )),
      weeklyProgress: progress,
    });
  } catch (error) {
    if (error instanceof ChallengeError) return sendChallengeError(res, error);
    console.error("Weekly AI challenge query failed:", error);
    return res.status(502).json({
      message: "AI 챌린지를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.",
    });
  }
});

router.post("/me/challenges/verify", requireAuth, async (req, res) => {
  try {
    const result = await verifyWeeklyChallenges(req.user.id);
    return res.status(200).json({
      weekStartDate: result.weekStart,
      status: "VERIFIED",
      successfulCount: result.successfulCount,
      totalCount: result.totalCount,
      earnedPoints: result.earnedPoints,
      showCelebration: result.showCelebration,
      message: result.successfulCount > 0
        ? `${result.successfulCount}/5 미션 성공! ${result.earnedPoints}P를 받았어요.`
        : "이번 주에는 성공한 미션이 없어요. 다음 주에 다시 가볍게 도전해봐요.",
      challenges: result.challenges.map((challenge) => ({
        challengeId: Number(challenge.id),
        status: challenge.status,
        message: challenge.status === "SUCCESS"
          ? `${challenge.title} 성공!`
          : `${challenge.title}은 아쉽게 미완료예요.`,
      })),
    });
  } catch (error) {
    if (error instanceof ChallengeError) return sendChallengeError(res, error);
    console.error("Weekly challenge verification failed:", error);
    return res.status(500).json({
      message: "챌린지 인증 처리 중 오류가 발생했습니다.",
    });
  }
});

export default router;
