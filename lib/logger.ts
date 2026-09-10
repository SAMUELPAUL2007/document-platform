import { randomUUID } from "crypto";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  jobId?: string;
  toolId?: string;
  event?: string;
  duration?: number;
  status?: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== "production";

function formatTimestamp(): string {
  return new Date().toISOString();
}

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v.length > 200) {
      out[k] = v.slice(0, 200) + "...(truncated)";
    } else if (k === "password" || k === "secret" || k === "token" || k === "key") {
      out[k] = "***";
    } else {
      out[k] = v;
    }
  }
  return out;
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    ts: formatTimestamp(),
    level,
    msg: message,
    ...(context ? redact(context) : {}),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      if (isDev) console.debug(line);
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => log("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext) => log("error", msg, ctx),
};

export function generateRequestId(): string {
  return randomUUID();
}

export function createChildLogger(requestId: string): {
  debug: (msg: string, ctx?: Omit<LogContext, "requestId">) => void;
  info: (msg: string, ctx?: Omit<LogContext, "requestId">) => void;
  warn: (msg: string, ctx?: Omit<LogContext, "requestId">) => void;
  error: (msg: string, ctx?: Omit<LogContext, "requestId">) => void;
} {
  return {
    debug: (msg: string, ctx?: Omit<LogContext, "requestId">) =>
      log("debug", msg, { ...ctx, requestId }),
    info: (msg: string, ctx?: Omit<LogContext, "requestId">) =>
      log("info", msg, { ...ctx, requestId }),
    warn: (msg: string, ctx?: Omit<LogContext, "requestId">) =>
      log("warn", msg, { ...ctx, requestId }),
    error: (msg: string, ctx?: Omit<LogContext, "requestId">) =>
      log("error", msg, { ...ctx, requestId }),
  };
}
