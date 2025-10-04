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

const cleanupOldBackups = () => {
  const maxBackupAgeDays = 10;
  const cutoff = Date.now() - maxBackupAgeDays * 24 * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(BACKUP_DIR);
    files.forEach((file) => {
      if (!file.endsWith(".sql")) return;

      // Match: mybrinda_db-backup-03_10_2025_13_38.sql
      const match = file.match(
        /backup-(\d{2})_(\d{2})_(\d{4})_(\d{2})_(\d{2})\.sql$/
      );
      if (!match) {
        logger.warn(
          `⚠️ Filename does not match expected backup format: ${file}`
        );
        return;
      }

      const [, day, month, year, hour, minute] = match.map(Number);
      const fileDate = new Date(year, month - 1, day, hour, minute);

      if (fileDate.getTime() < cutoff) {
        const filePath = path.join(BACKUP_DIR, file);
        fs.unlinkSync(filePath);
        logger.info(`🗑️ Deleted old backup file: ${file}`);
      }
    });
  } catch (err) {
    logger.error(`❌ Error during cleanup of old backups: ${err.message}`);
  }
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

    // After backup, cleanup old backups
    cleanupOldBackups();
  });
};

module.exports = backupDatabase;
