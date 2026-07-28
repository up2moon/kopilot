import { DataTypes } from "sequelize";

import { sequelize } from "../db.js";

export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nickname: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    is_first_login: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    mydata_connected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    budget_setup_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    total_points: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "user",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export const ExpenseCategory = sequelize.define(
  "ExpenseCategory",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "expense_category",
    underscored: true,
    timestamps: false,
  },
);

export const UserExpenseCategory = sequelize.define(
  "UserExpenseCategory",
  {
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
    },
    expense_category_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
    },
    cost: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "user_expense_category",
    underscored: true,
    timestamps: false,
  },
);

export const TransactionHistory = sequelize.define(
  "TransactionHistory",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    expense_category_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    trans_amt: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    x_api_tran_id: {
      type: DataTypes.STRING(25),
      allowNull: true,
    },
    trans_dtime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    merchant_name: {
      type: DataTypes.STRING(75),
      allowNull: false,
    },
    trans_category: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
  },
  {
    tableName: "transaction_history",
    underscored: true,
    timestamps: false,
  },
);

export const ConsumptionDna = sequelize.define(
  "ConsumptionDna",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    month: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    nickname: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    emoji: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: "🧬",
    },
    summary: {
      type: DataTypes.STRING(240),
      allowNull: false,
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    top_categories: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    response_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "consumption_dna",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "month"],
      },
    ],
  },
);

export const AiChallenge = sequelize.define(
  "AiChallenge",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    challenge_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    expense_category_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    challenge_type: {
      type: DataTypes.ENUM("NO_SPEND", "MAX_SPEND"),
      allowNull: true,
    },
    target_amount: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    estimated_saving_amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("IN_PROGRESS", "PENDING_VERIFICATION", "SUCCESS", "FAIL"),
      allowNull: false,
      defaultValue: "IN_PROGRESS",
    },
    verification_requested_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    finalized_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rewarded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    point: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "ai_challenge",
    underscored: true,
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "challenge_date"],
      },
      {
        fields: ["user_id", "start_date", "status"],
      },
    ],
  },
);

export const PointLedger = sequelize.define(
  "PointLedger",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    source_type: {
      type: DataTypes.ENUM("AI_CHALLENGE"),
      allowNull: false,
    },
    source_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "point_ledger",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ["source_type", "source_id"],
      },
      {
        fields: ["user_id", "created_at"],
      },
    ],
  },
);

export const InvestmentAsset = sequelize.define(
  "InvestmentAsset",
  {
    asset_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      primaryKey: true,
    },
    label: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    asset_type: {
      type: DataTypes.ENUM("STOCK", "ETF"),
      allowNull: false,
    },
    market: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "KOSPI",
    },
    description: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: "📌",
    },
    price_sync_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_synced_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "investment_asset",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["label"],
      },
      {
        fields: ["asset_type"],
      },
      {
        fields: ["price_sync_enabled"],
      },
    ],
  },
);

export const ExternalApiLock = sequelize.define(
  "ExternalApiLock",
  {
    lock_name: {
      type: DataTypes.STRING(80),
      allowNull: false,
      primaryKey: true,
    },
  },
  {
    tableName: "external_api_lock",
    underscored: true,
    timestamps: false,
  },
);

export const InvestmentPrice = sequelize.define(
  "InvestmentPrice",
  {
    asset_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      primaryKey: true,
    },
    trade_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      primaryKey: true,
    },
    close_price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    diff_rate: {
      type: DataTypes.DECIMAL(12, 6),
      allowNull: true,
    },
    raw_response: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "KOSCOM_CHECK",
    },
    synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "investment_price",
    underscored: true,
    timestamps: false,
    indexes: [
      {
        fields: ["trade_date"],
      },
    ],
  },
);

User.hasMany(UserExpenseCategory, {
  foreignKey: "user_id",
});
ExpenseCategory.hasMany(UserExpenseCategory, {
  foreignKey: "expense_category_id",
});
UserExpenseCategory.belongsTo(User, {
  foreignKey: "user_id",
});
UserExpenseCategory.belongsTo(ExpenseCategory, {
  foreignKey: "expense_category_id",
});

User.hasMany(TransactionHistory, {
  foreignKey: "user_id",
});
ExpenseCategory.hasMany(TransactionHistory, {
  foreignKey: "expense_category_id",
});
TransactionHistory.belongsTo(User, {
  foreignKey: "user_id",
});
TransactionHistory.belongsTo(ExpenseCategory, {
  foreignKey: "expense_category_id",
});

User.hasMany(ConsumptionDna, {
  foreignKey: "user_id",
});
ConsumptionDna.belongsTo(User, {
  foreignKey: "user_id",
});

User.hasMany(AiChallenge, {
  foreignKey: "user_id",
});
AiChallenge.belongsTo(User, {
  foreignKey: "user_id",
});
ExpenseCategory.hasMany(AiChallenge, {
  foreignKey: "expense_category_id",
});
AiChallenge.belongsTo(ExpenseCategory, {
  foreignKey: "expense_category_id",
});
User.hasMany(PointLedger, {
  foreignKey: "user_id",
});
PointLedger.belongsTo(User, {
  foreignKey: "user_id",
});

InvestmentAsset.hasMany(InvestmentPrice, {
  foreignKey: "asset_code",
  sourceKey: "asset_code",
});
InvestmentPrice.belongsTo(InvestmentAsset, {
  foreignKey: "asset_code",
  targetKey: "asset_code",
});

const defaultCategories = [
  "식비",
  "카페·간식",
  "쇼핑",
  "배달",
  "교통",
  "구독",
  "문화",
  "통신",
];

export async function seedDefaultCategories() {
  await ExpenseCategory.bulkCreate(
    defaultCategories.map((name) => ({ name })),
    {
      ignoreDuplicates: true,
    },
  );
}
