require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "security",
    database: process.env.DB_NAME || "farmease",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Database connection failed:");
        console.error(err.message);
        return;
    }

    console.log("MySQL database connected successfully!");
    connection.release();
});

module.exports = db;