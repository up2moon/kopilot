import express from "express";
import { Op } from "sequelize";

import { requireAuth } from "../middleware/auth.js";
import {
  ExpenseCategory,
  TransactionHistory,
  UserExpenseCategory,
} from "../models/index.js";
import {
  expenseCategories,
  generateFixtureTransactions,
  generateTransactionsWithOpenAI,
} from "../services/transactionGenerator.js";
import { getTopRankings, getUserRankingData } from "../services/ranking.js";
import { getConsumptionDna } from "../services/consumptionDna.js";
import { simulationHandler } from "./investment.js";

const router = express.Router();

const categoryMeta = {
  식비: {
    icon: "🍚",
    description: "식당, 편의점, 점심",
  },
  "카페·간식": {
    icon: "☕",
    description: "카페, 디저트, 간식",
  },
  쇼핑: {
    icon: "🛍️",
    description: "의류, 온라인 쇼핑, 잡화",
  },
  배달: {
    icon: "🛵",
    description: "배달의민족, 쿠팡이츠, 요기요",
  },
  교통: {
    icon: "🚕",
    description: "버스, 지하철, 택시",
  },
  구독: {
    icon: "📺",
    description: "넷플릭스, 유튜브 프리미엄, 멜론",
  },
  문화: {
    icon: "🎬",
    description: "영화, 공연, 전시",
  },
  통신: {
    icon: "📱",
    description: "휴대폰 요금, 인터넷",
  },
};

function toAuthUser(user) {
  return {
    id: Number(user.id),
    email: user.email,
    nickname: user.nickname,
    firstLoginCompleted: !user.is_first_login,
    myDataConnected: user.mydata_connected,
    budgetSetupCompleted: user.budget_setup_completed,
  };
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getMonthRange(month) {
  const normalizedMonth = /^\d{4}-\d{2}$/.test(month) ? month : getCurrentMonth();
  const start = new Date(`${normalizedMonth}-01T00:00:00.000Z`);
  const end = new Date(start);

  end.setUTCMonth(end.getUTCMonth() + 1);

  return {
    month: normalizedMonth,
    start,
    end,
  };
}

function toCategoryResponse(category) {
  const meta = categoryMeta[category.name] || {
    icon: "•",
    description: "소비 카테고리",
  };

  return {
    id: Number(category.id),
    name: category.name,
    icon: meta.icon,
    description: meta.description,
  };
}

function toTransactionResponse(transaction) {
  const categoryName = transaction.ExpenseCategory?.name || "기타";

  return {
    id: Number(transaction.id),
    paymentId: transaction.x_api_tran_id,
    approvedAt: transaction.trans_dtime,
    merchantName: transaction.merchant_name,
    amount: Number(transaction.trans_amt),
    category: categoryName,
    icon: categoryMeta[categoryName]?.icon || "•",
    status: "APPROVED",
  };
}

async function getCategoryMap() {
  const categories = await ExpenseCategory.findAll();

  return new Map(categories.map((category) => [category.name, category]));
}

async function replaceUserTransactions(userId, generatedTransactions) {
  const categoryMap = await getCategoryMap();
  const rows = generatedTransactions.map((payment, index) => {
    const category = categoryMap.get(payment.category);

    return {
      user_id: userId,
      expense_category_id: category?.id ?? null,
      trans_amt: payment.amount,
      x_api_tran_id: payment.paymentId,
      trans_dtime: payment.approvedAt,
      merchant_name: payment.merchantName,
      trans_category: String(index + 1).padStart(2, "0"),
    };
  });

  await TransactionHistory.destroy({
    where: {
      user_id: userId,
    },
  });

  await TransactionHistory.bulkCreate(rows);
}

async function getSpendingByCategory(userId, month = getCurrentMonth()) {
  const { start, end } = getMonthRange(month);
  const transactions = await TransactionHistory.findAll({
    where: {
      user_id: userId,
      trans_dtime: {
        [Op.gte]: start,
        [Op.lt]: end,
      },
    },
    include: [
      {
        model: ExpenseCategory,
        attributes: ["id", "name"],
      },
    ],
  });
  const spendingByCategory = new Map();

  for (const transaction of transactions) {
    const categoryName = transaction.ExpenseCategory?.name;

    if (categoryName) {
      spendingByCategory.set(
        categoryName,
        (spendingByCategory.get(categoryName) || 0) + Number(transaction.trans_amt),
      );
    }
  }

  return spendingByCategory;
}

function getRecommendedBudget(usedAmount) {
  if (usedAmount <= 0) {
    return 100000;
  }

  return Math.max(50000, Math.ceil((usedAmount * 0.85) / 10000) * 10000);
}

async function getBudgetStatus(userId, month = getCurrentMonth()) {
  const { month: normalizedMonth } = getMonthRange(month);
  const budgets = await UserExpenseCategory.findAll({
    where: {
      user_id: userId,
    },
    include: [
      {
        model: ExpenseCategory,
        attributes: ["id", "name"],
      },
    ],
  });
  const spendingByCategory = await getSpendingByCategory(userId, normalizedMonth);
  const categories = budgets.map((budget) => {
    const categoryName = budget.ExpenseCategory.name;
    const usedAmount = spendingByCategory.get(categoryName) || 0;
    const targetAmount = Number(budget.cost);
    const remainingAmount = targetAmount - usedAmount;
    const progressRate =
      targetAmount > 0 ? Math.min(100, Math.round((usedAmount / targetAmount) * 100)) : 0;

    return {
      category: categoryName,
      icon: categoryMeta[categoryName]?.icon || "•",
      targetAmount,
      usedAmount,
      remainingAmount,
      progressRate,
      recommendedAmount: getRecommendedBudget(usedAmount),
    };
  });

  return {
    month: normalizedMonth,
    totalRemainingAmount: categories.reduce(
      (sum, category) => sum + category.remainingAmount,
      0,
    ),
    categories,
  };
}

async function getGeneratedSummary(userId) {
  const month = getCurrentMonth();
  const spendingByCategory = await getSpendingByCategory(userId, month);

  return {
    month,
    categories: expenseCategories.map((category) => {
      const usedAmount = spendingByCategory.get(category) || 0;

      return {
        category,
        icon: categoryMeta[category]?.icon || "•",
        usedAmount,
        recommendedAmount: getRecommendedBudget(usedAmount),
      };
    }),
  };
}

router.get("/me/onboarding-status", requireAuth, async (req, res) => {
  const transactionCount = await TransactionHistory.count({
    where: {
      user_id: req.user.id,
    },
  });
  const budgetCount = await UserExpenseCategory.count({
    where: {
      user_id: req.user.id,
    },
  });

  return res.status(200).json({
    userId: Number(req.user.id),
    firstLoginCompleted: !req.user.is_first_login,
    myDataConnected: req.user.mydata_connected,
    budgetSetupCompleted: req.user.budget_setup_completed,
    transactionCount,
    budgetCount,
  });
});

router.post("/me/mydata/connect", requireAuth, async (req, res) => {
  try {
    const useFixture = process.env.MYDATA_TRANSACTION_SOURCE === "fixture";
    const generation = useFixture
      ? generateFixtureTransactions()
      : await generateTransactionsWithOpenAI();

    await replaceUserTransactions(req.user.id, generation.transactions);
    await req.user.update({
      mydata_connected: true,
    });

    return res.status(200).json({
      myDataConnected: true,
      transactionCount: generation.transactions.length,
      generationSource: generation.source,
      budgetSeed: await getGeneratedSummary(req.user.id),
    });
  } catch (error) {
    console.error("Mydata transaction generation failed:", error);

    return res.status(502).json({
      message: `거래내역 생성에 실패했습니다. ${error.message}`,
    });
  }
});

router.post("/me/mydata/disconnect", requireAuth, async (req, res) => {
  await TransactionHistory.destroy({
    where: {
      user_id: req.user.id,
    },
  });

  await req.user.update({
    mydata_connected: false,
  });

  return res.status(200).json({
    user: toAuthUser(req.user),
    myDataConnected: false,
    transactionCount: 0,
  });
});

router.post("/me/budgets", requireAuth, async (req, res) => {
  const month = req.body.month || getCurrentMonth();
  const budgets = Array.isArray(req.body.budgets) ? req.body.budgets : [];

  if (!budgets.length) {
    return res.status(400).json({
      message: "예산을 설정할 카테고리를 선택해주세요.",
    });
  }

  const categoryMap = await getCategoryMap();

  for (const budget of budgets) {
    const categoryName = String(budget.category || "").trim();
    const targetAmount = Number(budget.targetAmount);

    if (!categoryMap.has(categoryName)) {
      return res.status(400).json({
        message: "선택할 수 없는 카테고리가 포함되어 있습니다.",
      });
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return res.status(400).json({
        message: "예산은 1원 이상으로 설정해주세요.",
      });
    }
  }

  await UserExpenseCategory.destroy({
    where: {
      user_id: req.user.id,
    },
  });

  await UserExpenseCategory.bulkCreate(
    budgets.map((budget) => ({
      user_id: req.user.id,
      expense_category_id: categoryMap.get(budget.category).id,
      cost: Number(budget.targetAmount),
    })),
  );

  await req.user.update({
    is_first_login: false,
    budget_setup_completed: true,
  });

  return res.status(200).json({
    user: toAuthUser(req.user),
    budgetStatus: await getBudgetStatus(req.user.id, month),
  });
});

router.post("/me/onboarding/skip-goals", requireAuth, async (req, res) => {
  await UserExpenseCategory.destroy({
    where: {
      user_id: req.user.id,
    },
  });

  await req.user.update({
    is_first_login: false,
    budget_setup_completed: false,
  });

  return res.status(200).json({
    user: toAuthUser(req.user),
    skippedBudgetSetup: true,
  });
});

router.get("/me/transactions", requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const transactions = await TransactionHistory.findAll({
    where: {
      user_id: req.user.id,
    },
    include: [
      {
        model: ExpenseCategory,
        attributes: ["id", "name"],
      },
    ],
    order: [["trans_dtime", "DESC"]],
    limit,
  });

  return res.status(200).json({
    transactionCount: transactions.length,
    transactions: transactions.map(toTransactionResponse),
  });
});

router.get("/me/budgets/status", requireAuth, async (req, res) => {
  return res.status(200).json(await getBudgetStatus(req.user.id, req.query.month));
});

router.get("/me/spending/summary", requireAuth, async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();
    const period = req.query.period || "month";

    const { start, end } = getMonthRange(month);

    let periodStart = start;
    if (period === "3months") {
      periodStart = new Date(start);
      periodStart.setUTCMonth(periodStart.getUTCMonth() - 2);
    } else if (period === "6months") {
      periodStart = new Date(start);
      periodStart.setUTCMonth(periodStart.getUTCMonth() - 5);
    }

    const durationMs = end.getTime() - periodStart.getTime();
    const prevStart = new Date(periodStart.getTime() - durationMs);
    const prevEnd = new Date(periodStart.getTime());

    const transactions = await TransactionHistory.findAll({
      where: {
        user_id: req.user.id,
        trans_dtime: {
          [Op.gte]: periodStart,
          [Op.lt]: end,
        },
      },
      include: [
        {
          model: ExpenseCategory,
          attributes: ["id", "name"],
        },
      ],
      order: [["trans_dtime", "DESC"]],
    });

    const prevTransactions = await TransactionHistory.findAll({
      where: {
        user_id: req.user.id,
        trans_dtime: {
          [Op.gte]: prevStart,
          [Op.lt]: prevEnd,
        },
      },
    });

    const totalSpendingAmount = transactions.reduce(
      (sum, t) => sum + Number(t.trans_amt),
      0,
    );
    const prevTotalSpendingAmount = prevTransactions.reduce(
      (sum, t) => sum + Number(t.trans_amt),
      0,
    );

    let monthlyChangeRate = 0;
    if (prevTotalSpendingAmount > 0) {
      monthlyChangeRate =
        Math.round(
          ((totalSpendingAmount - prevTotalSpendingAmount) /
            prevTotalSpendingAmount) *
            1000,
        ) / 10;
    }

    const paymentCount = transactions.length;
    const averagePaymentAmount =
      paymentCount > 0 ? Math.round(totalSpendingAmount / paymentCount) : 0;

    const categoryMap = new Map();
    for (const t of transactions) {
      const catName = t.ExpenseCategory?.name || "기타";
      const amt = Number(t.trans_amt);
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, { amount: 0, count: 0 });
      }
      const item = categoryMap.get(catName);
      item.amount += amt;
      item.count += 1;
    }

    const categoriesList = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        category: name,
        icon: categoryMeta[name]?.icon || "•",
        amount: data.amount,
        percentage:
          totalSpendingAmount > 0
            ? Math.round((data.amount / totalSpendingAmount) * 1000) / 10
            : 0,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const merchantMap = new Map();
    for (const t of transactions) {
      const merchant = t.merchant_name || "기타 가맹점";
      const catName = t.ExpenseCategory?.name || "기타";
      const amt = Number(t.trans_amt);
      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, {
          merchantName: merchant,
          category: catName,
          icon: categoryMeta[catName]?.icon || "🏢",
          count: 0,
          totalAmount: 0,
        });
      }
      const m = merchantMap.get(merchant);
      m.count += 1;
      m.totalAmount += amt;
    }

    const frequentMerchants = Array.from(merchantMap.values())
      .sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount)
      .slice(0, 5);

    const trendMap = new Map();
    const chronTransactions = [...transactions].sort(
      (a, b) => new Date(a.trans_dtime) - new Date(b.trans_dtime),
    );
    for (const t of chronTransactions) {
      const d = new Date(t.trans_dtime);
      const dateStr = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
      trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + Number(t.trans_amt));
    }

    const trend = Array.from(trendMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));

    const insights = [];
    if (categoriesList.length > 0) {
      const topCat = categoriesList[0];
      insights.push({
        id: 1,
        title: "최대 지출 항목",
        description: `이번 달에는 ${topCat.category}에 가장 많은 돈(${topCat.amount.toLocaleString("ko-KR")}원)을 사용했어요.`,
        type: "top_category",
      });
    }

    if (prevTotalSpendingAmount > 0) {
      const direction = monthlyChangeRate >= 0 ? "증가" : "감소";
      const absRate = Math.abs(monthlyChangeRate);
      insights.push({
        id: 2,
        title: "소비 변화",
        description: `지난달 대비 소비가 ${absRate}% ${direction}했어요.`,
        type: "comparison",
      });
    } else {
      insights.push({
        id: 2,
        title: "소비 패턴 분석",
        description: "마이데이터 연동 기반으로 작성된 소비 현황을 확인해보세요.",
        type: "info",
      });
    }

    let weekendAmount = 0;
    for (const t of transactions) {
      const day = new Date(t.trans_dtime).getUTCDay();
      if (day === 0 || day === 6) {
        weekendAmount += Number(t.trans_amt);
      }
    }

    if (totalSpendingAmount > 0) {
      const weekendRatio = Math.round((weekendAmount / totalSpendingAmount) * 100);
      if (weekendRatio > 35) {
        insights.push({
          id: 3,
          title: "주말 소비 패턴",
          description: `전체 소비의 ${weekendRatio}%가 주말에 발생했어요. 주말 소비 조절을 시도해보세요!`,
          type: "weekend",
        });
      } else {
        insights.push({
          id: 3,
          title: "주중 소비 중심",
          description: "평일 소비 중심의 비교적 균형 잡힌 지출 패턴을 보이고 있어요.",
          type: "weekday",
        });
      }
    }

    const categoryTerms = {
      "카페·간식": "커피값",
      카페: "커피값",
      식비: "식비",
      배달: "배달비",
      쇼핑: "쇼핑 지출",
      교통: "교통비",
      구독: "구독료",
      문화: "문화 생활비",
      통신: "통신비",
    };

    const candidates = categoriesList.filter((cat) => Number(cat.amount) >= 5000);
    let savingCoachPreview;

    if (candidates.length === 0) {
      savingCoachPreview = {
        category: "카페·간식",
        term: "커피값",
        percentage: 20,
        potentialSavings: 60000,
        message: "커피값 20% 줄이면\n이번 달 60,000원을 아낄 수 있어요.",
      };
    } else {
      const targetCat = candidates[Math.floor(Math.random() * candidates.length)];
      const term = categoryTerms[targetCat.category] || `${targetCat.category} 지출`;
      const percentageOptions = [15, 20, 25, 30];
      const percent = percentageOptions[Math.floor(Math.random() * percentageOptions.length)];
      const rawSavings = Number(targetCat.amount) * (percent / 100);
      const potentialSavings = Math.max(1000, Math.round(rawSavings / 1000) * 1000);

      savingCoachPreview = {
        category: targetCat.category,
        term,
        percentage: percent,
        potentialSavings,
        message: `${term} ${percent}% 줄이면\n이번 달 ${potentialSavings.toLocaleString("ko-KR")}원을 아낄 수 있어요.`,
      };
    }

    return res.status(200).json({
      user: toAuthUser(req.user),
      month,
      period,
      summary: {
        totalSpendingAmount,
        monthlyChangeRate,
        paymentCount,
        averagePaymentAmount,
      },
      savingCoachPreview,
      categories: categoriesList,
      frequentMerchants,
      trend,
      insights,
      recentTransactions: transactions.slice(0, 7).map(toTransactionResponse),
    });
  } catch (error) {
    console.error("Dashboard summary failed:", error);
    return res.status(500).json({ message: "대시보드 데이터 조회 실패" });
  }
});

router.get("/me/investment-effect/simulation", requireAuth, simulationHandler);

router.get("/me/ranking", requireAuth, async (req, res) => {
  try {
    const data = await getTopRankings(req.user);
    return res.status(200).json(data.myRanking);
  } catch (error) {
    console.error("Get my ranking failed:", error);
    return res.status(500).json({ message: "내 랭킹 정보 조회 실패" });
  }
});

router.get("/me/reward-points", requireAuth, (req, res) => {
  return res.status(200).json({
    totalPoints: Number(req.user.total_points || 0),
  });
});

router.get("/me/consumption-dna", requireAuth, async (req, res) => {
  try {
    const data = await getConsumptionDna(req.user.id, req.query.month, {
      refresh: req.query.refresh === "true",
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error("Get consumption DNA failed:", error);
    const status =
      error.code === "INSUFFICIENT_DATA"
        ? 422
        : error.code === "OPENAI_NOT_CONFIGURED"
          ? 503
          : 502;

    return res.status(status).json({
      code: error.code || "CONSUMPTION_DNA_FAILED",
      message: error.message || "소비 DNA 분석에 실패했습니다.",
    });
  }
});

router.get("/ranking/top", requireAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const data = await getTopRankings(req.user);
    return res.status(200).json({
      myRanking: data.myRanking,
      topRankings: data.topRankings.slice(0, limit),
      updatedAtNotice: data.updatedAtNotice,
    });
  } catch (error) {
    console.error("Get top rankings failed:", error);
    return res.status(500).json({ message: "상위 랭킹 리스트 조회 실패" });
  }
});


export async function categoriesHandler(req, res) {
  const categories = await ExpenseCategory.findAll({
    order: [["id", "ASC"]],
  });

  return res.status(200).json({
    categories: categories.map(toCategoryResponse),
  });
}

export default router;
