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
  generateTransactionsWithOpenAI,
} from "../services/transactionGenerator.js";

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
    const generation = await generateTransactionsWithOpenAI();

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
    console.error("OpenAI mydata generation failed:", error);

    return res.status(502).json({
      message: `OpenAI 거래내역 생성에 실패했습니다. ${error.message}`,
    });
  }
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

export async function categoriesHandler(req, res) {
  const categories = await ExpenseCategory.findAll({
    order: [["id", "ASC"]],
  });

  return res.status(200).json({
    categories: categories.map(toCategoryResponse),
  });
}

export default router;
