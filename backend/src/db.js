import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function connectMySQL() {
  const connection = await db.getConnection();

  try {
    await connection.ping();
    console.log("MySQL connected");
  } finally {
    connection.release();
  }
}
