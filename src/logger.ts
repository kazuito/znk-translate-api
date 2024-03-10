import pino from "pino";

export const logger = pino({
  level: "trace",
  transport: {
    target: "pino/file",
    options: {
      destination: "logs/log.log",
      mkdir: true,
    },
  },
});
