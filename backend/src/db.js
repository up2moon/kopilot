import { DataTypes, Sequelize } from "sequelize";

export const db = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    },
  },
);

export const sequelize = db;

export const shouldSyncSchema = process.env.DB_SYNC_SCHEMA !== "false";
export const shouldAlterSchema = process.env.DB_SYNC_ALTER === "true";

export async function syncDatabase() {
  if (!shouldSyncSchema) {
    console.log("Database schema sync skipped");
    return;
  }

  // 기존 테이블에서는 Sequelize가 새 컬럼보다 모델 인덱스를 먼저 만들 수 있으므로
  // 주간 챌린지 컬럼을 먼저 보강한 뒤 모델 동기화를 실행한다.
  await ensureWeeklyChallengeSchema();

  await sequelize.sync({
    alter: shouldAlterSchema,
  });

  console.log(
    `Database schema synced${shouldAlterSchema ? " with alter" : ""}`,
  );

  await ensureWeeklyChallengeSchema();
}

async function ensureWeeklyChallengeSchema() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((table) => (
    typeof table === "string" ? table : table.tableName || table.name
  ));
  if (!tableNames.includes("ai_challenge")) return;

  let columns = await queryInterface.describeTable("ai_challenge");
  const additions = [
    [
      "challenge_type",
      {
        type: DataTypes.ENUM("NO_SPEND", "MAX_SPEND", "MAX_COUNT"),
        allowNull: true,
      },
    ],
    ["week_start_date", { type: DataTypes.DATEONLY, allowNull: true }],
    ["sequence", { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }],
    ["baseline_period_start", { type: DataTypes.DATEONLY, allowNull: true }],
    ["baseline_period_end", { type: DataTypes.DATEONLY, allowNull: true }],
    ["baseline_count", { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }],
    ["baseline_amount", { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 }],
    ["target_count", { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }],
  ];

  for (const [name, definition] of additions) {
    if (!columns[name]) {
      await queryInterface.addColumn("ai_challenge", name, definition);
    }
  }

  await queryInterface.changeColumn("ai_challenge", "challenge_type", {
    type: DataTypes.ENUM("NO_SPEND", "MAX_SPEND", "MAX_COUNT"),
    allowNull: true,
  });
  await queryInterface.changeColumn("ai_challenge", "baseline_period_start", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });
  await queryInterface.changeColumn("ai_challenge", "baseline_period_end", {
    type: DataTypes.DATEONLY,
    allowNull: true,
  });

  columns = await queryInterface.describeTable("ai_challenge");
  if (columns.week_start_date.allowNull || columns.sequence.allowNull) {
    await sequelize.query(`
      UPDATE ai_challenge
      SET
        week_start_date = COALESCE(
          week_start_date,
          DATE_SUB(challenge_date, INTERVAL WEEKDAY(challenge_date) DAY)
        ),
        sequence = COALESCE(sequence, WEEKDAY(challenge_date) + 1)
      WHERE week_start_date IS NULL OR sequence IS NULL
    `);
    await queryInterface.changeColumn("ai_challenge", "week_start_date", {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
  }
  await queryInterface.changeColumn("ai_challenge", "sequence", {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  });

  let indexes = await queryInterface.showIndex("ai_challenge");
  const legacyDailyUniqueIndexes = indexes.filter((index) => {
    const fields = index.fields?.map((field) => field.attribute).join(",");
    return index.unique && fields === "user_id,challenge_date";
  });
  for (const index of legacyDailyUniqueIndexes) {
    await queryInterface.removeIndex("ai_challenge", index.name);
  }

  indexes = await queryInterface.showIndex("ai_challenge");
  const hasWeeklyUniqueIndex = indexes.some((index) => {
    const fields = index.fields?.map((field) => field.attribute).join(",");
    return index.unique && fields === "user_id,week_start_date,sequence";
  });
  if (!hasWeeklyUniqueIndex) {
    await queryInterface.addIndex(
      "ai_challenge",
      ["user_id", "week_start_date", "sequence"],
      { unique: true, name: "ai_challenge_user_week_sequence" },
    );
  }
  indexes = await queryInterface.showIndex("ai_challenge");
  const duplicateWeeklyIndex = indexes.find(
    (index) => index.name === "ai_challenge_user_id_week_start_date_sequence",
  );
  const preferredWeeklyIndex = indexes.find(
    (index) => index.name === "ai_challenge_user_week_sequence",
  );
  if (duplicateWeeklyIndex && preferredWeeklyIndex) {
    await queryInterface.removeIndex(
      "ai_challenge",
      "ai_challenge_user_id_week_start_date_sequence",
    );
  }
}

export async function connectMySQL() {
  await sequelize.authenticate();
  console.log("MySQL connected");
}
