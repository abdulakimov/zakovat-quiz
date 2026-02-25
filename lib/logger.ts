export type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown> | undefined;

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLogLevel(): LogLevel {
  const raw =
    process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase() ??
    process.env.LOG_LEVEL?.toLowerCase() ??
    (process.env.NODE_ENV === "production" ? "info" : "debug");

  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel) {
  return levelPriority[level] >= levelPriority[resolveLogLevel()];
}

function serializeError(error: Error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function formatMeta(meta: LogMeta) {
  if (!meta) return "";

  try {
    return ` ${JSON.stringify(meta, (_key, value) => {
      if (value instanceof Error) return serializeError(value);
      return value;
    })}`;
  } catch {
    return " [meta_unserializable]";
  }
}

function emit(level: LogLevel, message: string, meta?: LogMeta) {
  if (!shouldLog(level)) return;

  const line = `${new Date().toISOString()} [${level}] ${message}${formatMeta(meta)}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (level === "debug") {
    console.debug(line);
    return;
  }

  console.info(line);
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    emit("debug", message, meta);
  },
  info(message: string, meta?: LogMeta) {
    emit("info", message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    emit("warn", message, meta);
  },
  error(message: string, meta?: LogMeta) {
    emit("error", message, meta);
  },
};
