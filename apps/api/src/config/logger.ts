import winston from "winston";
import { env } from "./env";

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  silent: env.isTest && env.LOG_LEVEL === "error",
  format: env.isProd
    ? winston.format.combine(baseFormat, winston.format.json())
    : winston.format.combine(baseFormat, winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});
