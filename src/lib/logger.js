import { existsSync, mkdirSync, appendFile } from "fs";
import { join } from "path";

const logDirectory = "./data/logs";

if (!existsSync(logDirectory)) {
  mkdirSync(logDirectory);
}

function createLogString(level, message, fileName) {
  const date = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  return `[${date}] [${level.toUpperCase()}] [${fileName}]: ${message}`;
}

function logToFile(level, message) {
  const logFilePath = join(logDirectory, `${level}.log`);

  appendFile(logFilePath, message, (err) => {
    if (err) {
      console.error(`Failed to write log to file: ${err}`);
    }
  });
}

export default class Logger {
  constructor(fileName) {
    this.fileName = fileName;
  }

  info(message) {
    const level = "info";
    const logMessage = createLogString(level, message, this.fileName);
    console.log(logMessage);
    logToFile(level, logMessage);
  }

  error(message) {
    const level = "error";
    const logMessage = createLogString(level, message, this.fileName);
    console.error(logMessage);
    logToFile(level, logMessage);
  }

  warn(message) {
    const level = "warn";
    const logMessage = createLogString(level, message, this.fileName);
    console.warn(logMessage);
    logToFile(level, logMessage);
  }
}
