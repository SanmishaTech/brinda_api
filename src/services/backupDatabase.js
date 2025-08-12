const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL; // e.g. "mysql://user:pass@host:port/db"

// ✅ Regex to extract values (port optional)
const regex = /mysql:\/\/(.*?):(.*?)@(.*?)(?::(\d+))?\/(.*)/;
const matches = databaseUrl.match(regex);

// Global DB vars
let DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME;

if (matches) {
  [, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME] = matches;

  // ✅ Default port to 3306 if not provided in DATABASE_URL
  DB_PORT = DB_PORT || "3306";

  // logger.info(`User: ${DB_USER}`);
  // logger.info(`Password: ${DB_PASSWORD}`);
  // logger.info(`Host: ${DB_HOST}`);
  // logger.info(`Port: ${DB_PORT}`);
  // logger.info(`Database: ${DB_NAME}`);
} else {
  logger.error("❌ DATABASE_URL is invalid");
  process.exit(1); // Stop execution if invalid
}

// Backup directory
const BACKUP_DIR = path.join(__dirname, "../../backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(now.getDate())}_${pad(
    now.getMonth() + 1
  )}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
};

const backupDatabase = () => {
  const fileName = `${DB_NAME}-backup-${getFormattedDate()}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  // ✅ Full mysqldump with host and port
  const cmd = `mysqldump -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > "${filePath}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      logger.error(`❌ Backup failed: ${error.message}`);
      return;
    }
    if (stderr) {
      logger.warn(`⚠️ Stderr: ${stderr}`);
    }
    logger.info(`✅ Backup completed: ${fileName}`);
  });
};

module.exports = backupDatabase;
