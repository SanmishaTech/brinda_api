// taskQueue.js
const { fork } = require("child_process");
const path = require("path");
const logger = require("./src/utils/logger");

const taskQueue = [];
let isRunning = false;

function enqueueTask(data) {
  taskQueue.push(data);
  runNextTask();
}

function runNextTask() {
  if (isRunning || taskQueue.length === 0) return;

  try {
    isRunning = true;
    const nextTask = taskQueue.shift();

    const subprocess = fork(
      path.join(__dirname, "background", "purchaseWorker.js")
    );

    subprocess.send(nextTask);

    subprocess.on("message", (msg) => {
      logger.info(`Message from subprocess: ${msg}`);
    });

    subprocess.on("exit", (code) => {
      isRunning = false;
      logger.info(`Subprocess exited with code ${code}`);
      runNextTask(); // Process next task
    });
    // start

    subprocess.on("error", (err) => {
      logger.info(`Subprocess error: ${err}`);
      isRunning = false;
      runNextTask(); // move to next even if there's an error
    });

    subprocess.on("close", (code, signal) => {
      logger.info(`Subprocess closed. Code: ${code}, Signal: ${signal}`);
    });

    // end
  } catch (err) {
    logger.info(`Error in taskQueue: ${err}`);
    isRunning = false; // Allow queue to resume
    runNextTask(); // Try next task if this one fails
  }
}

module.exports = enqueueTask;
