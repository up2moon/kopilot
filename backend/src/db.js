import { Sequelize } from "sequelize";

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
export const shouldAlterSchema = process.env.DB_SYNC_ALTER !== "false";

export async function syncDatabase() {
  if (!shouldSyncSchema) {
    console.log("Database schema sync skipped");
    return;
  }

  await sequelize.sync({
    alter: shouldAlterSchema,
  });

  console.log(
    `Database schema synced${shouldAlterSchema ? " with alter" : ""}`,
  );
}

export async function connectMySQL() {
  await sequelize.authenticate();
  console.log("MySQL connected");
}
