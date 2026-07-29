import {
  AiChallenge,
  AssetGoal,
  ExpenseCategory,
  InvestmentAsset,
  InvestmentContribution,
  InvestmentPrice,
  TransactionHistory,
} from "../models/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const demoAssetCode = "360750";

function getKstDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getMonday(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return getKstDate(result);
}

export async function seedDemoAccount(user) {
  const categories = await ExpenseCategory.findAll();
  const categoryByName = new Map(
    categories.map((category) => [category.name, category]),
  );
  const now = new Date();
  const merchants = [
    ["스타벅스 부산대점", "카페·간식", 5500],
    ["배달의민족", "배달", 27800],
    ["쿠팡", "쇼핑", 42900],
    ["넷플릭스", "구독", 17000],
    ["카카오T", "교통", 12800],
    ["GS25", "식비", 8900],
    ["올리브영", "쇼핑", 26500],
    ["메가커피", "카페·간식", 3500],
  ];
  const transactionRows = Array.from({ length: 64 }, (_, index) => {
    const [merchantName, categoryName, baseAmount] =
      merchants[index % merchants.length];
    const transactedAt = new Date(
      now.getTime() - ((index % 29) * DAY_MS + (index % 10) * 37 * 60 * 1000),
    );

    return {
      user_id: user.id,
      expense_category_id: categoryByName.get(categoryName)?.id || null,
      trans_amt: baseAmount + (index % 4) * 1000,
      x_api_tran_id: `DEMO${user.id}${String(index).padStart(4, "0")}`.slice(
        0,
        25,
      ),
      trans_dtime: transactedAt,
      merchant_name: merchantName,
      trans_category: String((index % 9) + 1).padStart(2, "0"),
    };
  });

  await TransactionHistory.bulkCreate(transactionRows);
  await InvestmentAsset.upsert({
    asset_code: demoAssetCode,
    label: "TIGER 미국S&P500",
    asset_type: "ETF",
    market: "ETF",
    description: "S&P 500 지수 추종 ETF",
    icon: "📈",
    price_sync_enabled: true,
    last_synced_at: now,
  });

  const today = getKstDate(now);
  const [latestPrice] = await InvestmentPrice.findOrCreate({
    where: {
      asset_code: demoAssetCode,
      trade_date: today,
    },
    defaults: {
      close_price: 25180,
      diff_rate: 0.0042,
      raw_response: {
        demo: true,
      },
      source: "DEMO_FIXTURE",
      synced_at: now,
    },
  });
  const currentPrice = Number(latestPrice.close_price);
  const startDate = addMonths(now, -24);
  const goal = await AssetGoal.create({
    user_id: user.id,
    title: "3년 안에 만드는 1억 시드머니",
    target_amount: 100000000,
    start_date: getKstDate(startDate),
    target_date: getKstDate(addMonths(startDate, 36)),
    asset_code: demoAssetCode,
    recommended_investment_ratio: 40,
    selected_investment_ratio: 40,
    status: "ACTIVE",
  });
  const contributionCount = 24;
  const totalSavingTarget = 68000000;
  const baseSaving = Math.floor(totalSavingTarget / contributionCount);
  let remainingSaving = totalSavingTarget;
  const contributionRows = [];

  for (let index = 0; index < contributionCount; index += 1) {
    const contributedAt = addMonths(startDate, index);
    const savingAmount =
      index === contributionCount - 1 ? remainingSaving : baseSaving;
    remainingSaving -= savingAmount;
    const investmentAmount = Math.round(savingAmount * 0.4);
    const cashAmount = savingAmount - investmentAmount;
    const purchasePrice = Math.round(21800 + index * 115);

    contributionRows.push({
      goal_id: goal.id,
      challenge_id: null,
      saving_amount: savingAmount,
      investment_amount: investmentAmount,
      cash_amount: cashAmount,
      asset_code: demoAssetCode,
      price_trade_date: getKstDate(contributedAt),
      purchase_price: purchasePrice,
      quantity: investmentAmount / purchasePrice,
      contributed_at: contributedAt,
    });
  }

  await InvestmentContribution.bulkCreate(contributionRows);
  const weekStart = getMonday(now);
  const weekEnd = new Date(`${weekStart}T00:00:00+09:00`);
  weekEnd.setDate(weekEnd.getDate() + 4);
  const cafeCategory = categoryByName.get("카페·간식");
  const deliveryCategory = categoryByName.get("배달");
  const challengeRows = [
    {
      title: "출근길 카페 이용 줄이기",
      description:
        "이번 주 출근길 카페 결제를 2회 줄여 11,000원을 시드머니로 확보해 볼까요?",
      category: cafeCategory,
      type: "MAX_COUNT",
      baselineCount: 8,
      targetCount: 6,
      savingAmount: 11000,
      status: "SUCCESS",
    },
    {
      title: "일요일 배달 한 번 바꾸기",
      description:
        "일요일 배달 한 번을 집밥으로 바꿔 18,000원을 다음 적립금으로 만들어 보세요.",
      category: deliveryCategory,
      type: "MAX_COUNT",
      baselineCount: 3,
      targetCount: 2,
      savingAmount: 18000,
      status: "IN_PROGRESS",
    },
  ];

  await AiChallenge.bulkCreate(
    challengeRows.map((challenge, index) => ({
      user_id: user.id,
      title: challenge.title,
      description: challenge.description,
      challenge_date: weekStart,
      week_start_date: weekStart,
      sequence: index + 1,
      expense_category_id: challenge.category?.id || null,
      challenge_type: challenge.type,
      baseline_period_start: getKstDate(new Date(now.getTime() - 14 * DAY_MS)),
      baseline_period_end: getKstDate(new Date(now.getTime() - 7 * DAY_MS)),
      baseline_count: challenge.baselineCount,
      baseline_amount: challenge.savingAmount * challenge.baselineCount,
      target_count: challenge.targetCount,
      target_amount: null,
      estimated_saving_amount: challenge.savingAmount,
      start_date: weekStart,
      end_date: getKstDate(weekEnd),
      status: challenge.status,
      completed_at: challenge.status === "SUCCESS" ? now : null,
      finalized_at: challenge.status === "SUCCESS" ? now : null,
      point: challenge.status === "SUCCESS" ? 50 : 0,
    })),
  );

  await user.update({
    is_first_login: false,
    mydata_connected: true,
    budget_setup_completed: true,
  });

  return {
    goalId: Number(goal.id),
    currentPrice,
  };
}
