const { exec } = require("child_process");
const path = require("path");
const fs = require("fs").promises;
const logger = require("../utils/logger");

// DB config from env
const databaseUrl = process.env.DATABASE_URL;
const regex = /mysql:\/\/(.*?):(.*?)@(.*?)(?::(\d+))?\/(.*)/;
const matches = databaseUrl.match(regex);

let DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME;

if (matches) {
  [, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME] = matches;
  DB_PORT = DB_PORT || "3306";
} else {
  throw new Error("Invalid DATABASE_URL");
}

// Backup directory
const BACKUP_DIR = path.join(__dirname, "../../backups");

// Ensure directory exists
fs.mkdir(BACKUP_DIR, { recursive: true }).catch((err) =>
  logger.error("Failed to create backup dir:", err)
);

const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(now.getDate())}_${pad(
    now.getMonth() + 1
  )}_${now.getFullYear()}_${pad(now.getHours())}_${pad(now.getMinutes())}`;
};

// ✅ Cleanup old backup files older than `days`
const cleanupOldBackups = async (days = 10) => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith(".sql")) continue;

      // Example filename: mybrinda_db-backup-03_10_2025_13_38.sql
      const match = file.match(
        /backup-(\d{2})_(\d{2})_(\d{4})_(\d{2})_(\d{2})\.sql$/
      );

      if (!match) {
        logger.warn(`⚠️ Filename does not match expected format: ${file}`);
        continue;
      }

      const [, day, month, year, hour, minute] = match.map(Number);
      const fileDate = new Date(year, month - 1, day, hour, minute); // month is 0-based

      if (fileDate.getTime() < cutoff) {
        const filePath = path.join(BACKUP_DIR, file);
        await fs.unlink(filePath);
        logger.info(`🗑️ Deleted old backup file: ${file}`);
      }
    }
  } catch (err) {
    logger.error("❌ Error during backup cleanup:", err);
  }
};

// Backup lock
let isBackupRunning = false;

const purchaseBackup = async () => {
  if (isBackupRunning) {
    const msg = "⚠️ Backup already in progress";
    logger.warn(msg);
    throw new Error(msg);
  }

  isBackupRunning = true;

  try {
    await cleanupOldBackups(); // ✅ Wait for cleanup

    const fileName = `${DB_NAME}-backup-${getFormattedDate()}.sql`;

    const filePath = path.join(BACKUP_DIR, fileName);
    const cmd = `mysqldump -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > "${filePath}"`;

    // logger.info(`📦 Starting backup: ${fileName}`);

    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        isBackupRunning = false;

        if (error) {
          logger.error(`❌ Backup failed: ${error.message}`);
          return reject(error);
        }
        if (stderr) {
          // logger.warn(`⚠️ Backup warning: ${stderr}`);
        }

        logger.info(`✅ Backup completed successfully: ${fileName}`);
        resolve();
      });
    });

    return filePath;
  } catch (err) {
    isBackupRunning = false;
    throw err;
  }
};

module.exports = { purchaseBackup };
