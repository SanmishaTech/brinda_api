// const { exec } = require("child_process");
// const path = require("path");
// const fs = require("fs");
// const logger = require("../utils/logger");

// const databaseUrl = process.env.DATABASE_URL; // e.g. "mysql://root:your_password@localhost:3306/brinda"
// const regex = /mysql:\/\/(.*):(.*)@(.*):(\d+)\/(.*)/;
// const matches = databaseUrl.match(regex);

// // Global DB vars
// let DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME;

// if (matches) {
//   [, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME] = matches;
//   logger.info(`User: ${DB_USER}`);
//   logger.info(`Password: ${DB_PASSWORD}`);
//   logger.info(`Host: ${DB_HOST}`);
//   logger.info(`Port: ${DB_PORT}`);
//   logger.info(`Database: ${DB_NAME}`);
// } else {
//   logger.error("❌ DATABASE_URL is invalid");
//   process.exit(1); // Stop execution if invalid
// }

// // Backup directory
// const BACKUP_DIR = path.join(__dirname, "../../backups");

// // Make sure backup directory exists
// if (!fs.existsSync(BACKUP_DIR)) {
//   fs.mkdirSync(BACKUP_DIR, { recursive: true });
// }

// // Format date like dd_mm_yyyy_HH_MM
// const getFormattedDate = () => {
//   const now = new Date();
//   const pad = (n) => n.toString().padStart(2, "0");

//   const day = pad(now.getDate());
//   const month = pad(now.getMonth() + 1);
//   const year = now.getFullYear();
//   const hour = pad(now.getHours());
//   const minute = pad(now.getMinutes());

//   return `${day}_${month}_${year}_${hour}_${minute}`;
// };

// const backupDatabase = () => {
//   const fileName = `${DB_NAME}-backup-${getFormattedDate()}.sql`;
//   const filePath = path.join(BACKUP_DIR, fileName);

//   const cmd = `mysqldump -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > "${filePath}"`;

//   exec(cmd, (error, stdout, stderr) => {
//     if (error) {
//       logger.error(`❌ Backup failed: ${error.message}`);
//       return;
//     }
//     if (stderr) {
//       logger.warn(`⚠️ Stderr: ${stderr}`);
//     }
//     logger.info(`✅ Backup completed.`);
//   });
// };

// module.exports = backupDatabase;
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

// Get DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL; // e.g. "mysql://user:pass@host:port/db"

// ✅ Improved regex: port is optional
const regex = /mysql:\/\/(.*):(.*)@(.*?)(?::(\d+))?\/(.*)/;
const matches = databaseUrl.match(regex);

// Global DB vars
let DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME;

if (matches) {
  [, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME] = matches;

  // ✅ Default port to 3303 if not provided
  DB_PORT = DB_PORT || "3003";

  logger.info(`User: ${DB_USER}`);
  logger.info(`Password: ${DB_PASSWORD}`);
  logger.info(`Host: ${DB_HOST}`);
  logger.info(`Port: ${DB_PORT}`);
  logger.info(`Database: ${DB_NAME}`);
} else {
  logger.error("❌ DATABASE_URL is invalid");
  process.exit(1); // Stop execution if invalid
}

// Backup directory
const BACKUP_DIR = path.join(__dirname, "../../backups");

// Make sure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Format date like dd_mm_yyyy_HH_MM
const getFormattedDate = () => {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");

  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());

  return `${day}_${month}_${year}_${hour}_${minute}`;
};

const backupDatabase = () => {
  const fileName = `${DB_NAME}-backup-${getFormattedDate()}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);

  // ✅ Include host and port in mysqldump command
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
