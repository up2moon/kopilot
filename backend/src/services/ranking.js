import { User, TransactionHistory, UserExpenseCategory, AiChallenge } from "../models/index.js";
import { Op } from "sequelize";
import { getConsumptionDnaMap } from "./consumptionDna.js";

const ADJECTIVES = [
  "알뜰한",
  "절약왕",
  "현명한",
  "짠테크",
  "조용한",
  "스마트한",
  "지혜로운",
  "소박한",
  "부지런한",
  "열정적인",
];

const NOUNS = [
  { name: "코알라", emoji: "🐨" },
  { name: "민트", emoji: "🌱" },
  { name: "라임", emoji: "🍋" },
  { name: "블루", emoji: "🔵" },
  { name: "포도", emoji: "🍇" },
  { name: "사자", emoji: "🦁" },
  { name: "펭귄", emoji: "🐧" },
  { name: "체리", emoji: "🍒" },
  { name: "아보카도", emoji: "🥑" },
  { name: "햄스터", emoji: "🐹" },
];

/**
 * user_id를 기반으로 고정된 익명 닉네임 및 이모지 동적 생성
 */
export function generateAnonymousProfile(userId) {
  const numId = Number(userId) || 1;
  const adjIndex = (numId * 7) % ADJECTIVES.length;
  const nounIndex = (numId * 13) % NOUNS.length;
  const num = ((numId * 17) % 90) + 10; // 10 ~ 99

  const adj = ADJECTIVES[adjIndex];
  const nounObj = NOUNS[nounIndex];

  return {
    anonymousNickname: `${adj} ${nounObj.name} ${num}`,
    avatarEmoji: nounObj.emoji,
  };
}

/**
 * 사용자의 실제 전월 대비 절약 금액, 당월 챌린지 성공 횟수, 랭킹 점수 계산 (100% 실제 데이터 기반)
 */
export async function getUserRankingData(user) {
  const userId = user.id;

  const now = new Date();
  // 이번달 1일 00:00:00
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // 지난달 1일 00:00:00
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // 지난달 말일 23:59:59
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // 1. 이번달 성공한 챌린지 수 (AiChallenge 테이블 연동)
  const thisMonthChallengeCount = await AiChallenge.count({
    where: {
      user_id: userId,
      status: "SUCCESS",
      start_date: {
        [Op.gte]: startOfThisMonth,
      },
    },
  }).catch(() => 0);

  // 2. 지난달 총 지출액 조회
  const lastMonthTransactions = await TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: {
        [Op.gte]: startOfLastMonth,
        [Op.lte]: endOfLastMonth,
      },
    },
  }).catch(() => []);

  const lastMonthSpent = lastMonthTransactions.reduce((acc, t) => acc + Number(t.trans_amt || 0), 0);

  // 3. 이번달 총 지출액 조회
  const thisMonthTransactions = await TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: {
        [Op.gte]: startOfThisMonth,
      },
    },
  }).catch(() => []);

  const thisMonthSpent = thisMonthTransactions.reduce((acc, t) => acc + Number(t.trans_amt || 0), 0);

  // 4. 당월 절약 금액 계산 (전월 대비 더 적게 썼을 때만 절약 금액 반영, 더 많이 썼으면 0원)
  let savedAmount = 0;
  if (lastMonthSpent > 0) {
    savedAmount = lastMonthSpent > thisMonthSpent ? lastMonthSpent - thisMonthSpent : 0;
  } else {
    // 지난달 결제 내역이 없으면 당월 설정 예산 대비 아낀 금액으로 보조 계산
    const budgets = await UserExpenseCategory.findAll({ where: { user_id: userId } }).catch(() => []);
    const totalBudget = budgets.reduce((acc, b) => acc + Number(b.cost || 0), 0);
    if (totalBudget > thisMonthSpent) {
      savedAmount = totalBudget - thisMonthSpent;
    }
  }

  // 5. 실제 랭킹 점수 계산
  // 챌린지 보상은 성공 시 user.total_points에 이미 한 번 적립된다.
  // 성공 개수를 다시 점수화하면 보상이 이중 합산된다.
  const dbPoints = Number(user.total_points || 0);
  const savedPoints = Math.floor(savedAmount / 100);
  const rankScore = dbPoints + savedPoints;

  // 6. 프로필 정보 생성
  const profile = generateAnonymousProfile(userId);

  return {
    userId,
    anonymousNickname: profile.anonymousNickname,
    avatarEmoji: profile.avatarEmoji,
    savedAmount,
    rankScore,
    completedChallengesCount: thisMonthChallengeCount,
  };
}

/**
 * 상위 랭킹 리스트 및 현재 사용자 랭킹 순위 조회 (100% DB 유저 기반)
 */
export async function getTopRankings(currentUser) {
  const allDbUsers = await User.findAll().catch(() => [currentUser]);
  const joinedAtByUserId = new Map(
    allDbUsers.map((user) => {
      const joinedAt = new Date(user.createdAt || user.created_at || 0).getTime();

      return [Number(user.id), Number.isFinite(joinedAt) ? joinedAt : 0];
    }),
  );
  const month = new Date().toISOString().slice(0, 7);
  const dnaMap = await getConsumptionDnaMap(
    allDbUsers.map((user) => Number(user.id)),
    month,
  ).catch(() => new Map());

  const rawList = await Promise.all(allDbUsers.map((u) => getUserRankingData(u)));
  const listWithDna = rawList.map((item) => ({
    ...item,
    consumptionDna: dnaMap.get(Number(item.userId)) || null,
  }));

  // 점수가 같으면 가입일이 빠른 사용자, 가입일까지 같으면 사용자 ID가
  // 작은 사용자를 우선해 항상 동일하고 중복 없는 순위를 만든다.
  listWithDna.sort((a, b) => {
    const scoreDifference = b.rankScore - a.rankScore;

    if (scoreDifference !== 0) return scoreDifference;

    const joinedAtDifference =
      joinedAtByUserId.get(Number(a.userId)) -
      joinedAtByUserId.get(Number(b.userId));

    if (joinedAtDifference !== 0) return joinedAtDifference;

    return Number(a.userId) - Number(b.userId);
  });

  const rankedList = listWithDna.map((item, index) => ({
    ...item,
    rank: index + 1,
    isMe: Number(item.userId) === Number(currentUser.id),
  }));

  // 내 랭킹 찾기
  const currentUserData = await getUserRankingData(currentUser);
  const myRankInfo = rankedList.find((item) => item.isMe) || {
    ...currentUserData,
    consumptionDna: dnaMap.get(Number(currentUser.id)) || null,
    rank: 1,
    isMe: true,
  };

  return {
    myRanking: myRankInfo,
    topRankings: rankedList,
    updatedAtNotice: "1시간마다 갱신",
  };
}
