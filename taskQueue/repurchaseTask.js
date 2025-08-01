// repurchaseTask.js
const { fork } = require("child_process");
const path = require("path");
const logger = require("../src/utils/logger");

const repurchaseTaskQueue = [];
let isRunning = false;

function repurchaseTask(data) {
  repurchaseTaskQueue.push(data);
  runNextTask();
}

function runNextTask() {
  if (isRunning || repurchaseTaskQueue.length === 0) return;

  try {
    isRunning = true;
    const nextTask = repurchaseTaskQueue.shift();

    const subprocess = fork(
      path.join(__dirname, "..", "background", "repurchaseWorker.js")
    );

    subprocess.send(nextTask);

    subprocess.on("message", (msg) => {
      logger.info(`Message from repurchaseTask subprocess: ${msg}`);
    });

    subprocess.on("exit", (code) => {
      isRunning = false;
      logger.info(`repurchase Task Subprocess exited with code ${code}`);
      runNextTask(); // Process next task
    });
    // start

    subprocess.on("error", (err) => {
      logger.info(`repurchaseTask Subprocess error: ${err}`);
      isRunning = false;
      runNextTask(); // move to next even if there's an error
    });

    subprocess.on("close", (code, signal) => {
      logger.info(
        ` repurchase Task Subprocess closed. Code: ${code}, Signal: ${signal}`
      );
    });

    // end
  } catch (err) {
    logger.info(`Error in repurchase repurchaseTaskQueue: ${err}`);
    isRunning = false; // Allow queue to resume
    runNextTask(); // Try next task if this one fails
  }
}

module.exports = repurchaseTask;
