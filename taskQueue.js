// taskQueue.js
const { fork } = require("child_process");
const path = require("path");

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
      console.log("Message from subprocess:", msg);
    });

    subprocess.on("exit", (code) => {
      isRunning = false;
      console.log(`Subprocess exited with code ${code}`);
      runNextTask(); // Process next task
    });
  } catch (err) {
    console.error("Error in taskQueue:", err);
    isRunning = false; // Allow queue to resume
    runNextTask(); // Try next task if this one fails
  }
}

module.exports = enqueueTask;
