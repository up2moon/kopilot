import { appendCurrentWeeklyChallenge } from "./challengeService.js";

export const CREATE_WEEKLY_CHALLENGE_ACTION = "CREATE_WEEKLY_CHALLENGE";
export const CREATE_WEEKLY_CHALLENGE_TOOL = "create_weekly_saving_challenge";

const allowedToolNames = new Set([CREATE_WEEKLY_CHALLENGE_TOOL]);

export function getSavingBotFunctionTools() {
  return [
    {
      type: "function",
      name: CREATE_WEEKLY_CHALLENGE_TOOL,
      description:
        "로그인 사용자가 이번 주 절약 챌린지를 실제로 만들어 달라고 명확히 요청할 때만 호출한다. 생성 방법, 추천, 설명을 묻는 질문에는 호출하지 않는다.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      strict: true,
    },
  ];
}

async function createWeeklySavingChallenge(userId) {
  const result = await appendCurrentWeeklyChallenge(userId);

  if (result.created && result.challenge) {
    return {
      status: "CREATED",
      weekStartDate: result.weekStart,
      weekEndDate: result.weekEnd,
      challengeId: Number(result.challenge.id),
      challengeCount: result.totalCount,
      estimatedSavingAmount: Number(
        result.challenge.estimated_saving_amount || 0,
      ),
      challenge: {
        id: Number(result.challenge.id),
        content: result.challenge.title,
        type: result.challenge.challenge_type,
        targetCount: result.challenge.target_count === null
          ? null
          : Number(result.challenge.target_count),
        targetAmount: result.challenge.target_amount === null
          ? null
          : Number(result.challenge.target_amount),
        point: Number(result.challenge.point || 0),
      },
      destination: "/challenge",
    };
  }

  if (!result.creationAllowed) {
    return {
      status: "CREATION_CLOSED",
      message:
        "이번 주 새 미션 생성 기간이 끝났어요. 다음 주 월요일에 새로운 미션을 만들 수 있어요.",
      destination: null,
    };
  }

  if (result.onboardingRequired) {
    return {
      status: "ONBOARDING_REQUIRED",
      message: "챌린지를 만들기 위한 소비 정보가 필요해요.",
      destination: null,
    };
  }

  const error = new Error("Weekly challenge set is incomplete");

  error.code = "CHALLENGE_SET_INCOMPLETE";
  throw error;
}

export async function executeSavingBotTool(name, { userId }) {
  if (!allowedToolNames.has(name)) {
    const error = new Error(`Unsupported saving bot tool: ${name}`);

    error.code = "SAVING_BOT_TOOL_NOT_ALLOWED";
    throw error;
  }

  if (!userId) {
    const error = new Error("Authenticated user is required for saving bot tools");

    error.code = "SAVING_BOT_TOOL_AUTH_REQUIRED";
    throw error;
  }

  if (name === CREATE_WEEKLY_CHALLENGE_TOOL) {
    return createWeeklySavingChallenge(userId);
  }

  const error = new Error(`Saving bot tool is not implemented: ${name}`);

  error.code = "SAVING_BOT_TOOL_NOT_IMPLEMENTED";
  throw error;
}

export function getChallengeClientAction(toolResult) {
  if (
    toolResult?.status !== "CREATED"
    || toolResult.destination !== "/challenge"
  ) {
    return null;
  }

  return {
    type: "NAVIGATE",
    path: "/challenge",
    ...(Number.isInteger(Number(toolResult.challengeId))
      ? { highlightChallengeId: Number(toolResult.challengeId) }
      : {}),
  };
}

export function getChallengeToolFallbackAnswer(toolResult) {
  if (toolResult?.status === "CREATED") {
    const challengeContent = toolResult.challenge?.content;

    if (challengeContent) {
      return `새로운 절약 챌린지를 추가했어요!\n\n${challengeContent}\n\n챌린지 화면에서 바로 확인해보세요.`;
    }

    return "새로운 절약 챌린지를 추가했어요. 챌린지 화면에서 바로 확인해보세요!";
  }

  return toolResult?.message || "챌린지를 준비하지 못했어요. 잠시 후 다시 시도해주세요.";
}
