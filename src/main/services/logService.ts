import * as log4js from "log4js";

const logger: log4js.Logger = log4js.getLogger();
logger.level = "debug";

export function configure(filename: string) {
  log4js.configure({
    appenders: {
      everything: {
        type: "file",
        maxLogSize: 10485760,
        filename,
      },
    },
    categories: {
      default: { appenders: ["everything"], level: "info" },
    },
  });
}

export default logger;
