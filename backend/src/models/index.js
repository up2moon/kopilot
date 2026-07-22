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
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("IN_PROGRESS", "SUCCESS", "FAIL"),
      allowNull: false,
      defaultValue: "IN_PROGRESS",
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

User.hasMany(AiChallenge, {
  foreignKey: "user_id",
});
AiChallenge.belongsTo(User, {
  foreignKey: "user_id",
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
