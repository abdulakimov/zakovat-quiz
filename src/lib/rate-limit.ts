type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ConsumeRateLimitInput = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
};

type ConsumeRateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const store = new Map<string, RateLimitEntry>();

function now() {
  return Date.now();
}

function makeStoreKey(bucket: string, key: string) {
  return `${bucket}:${key}`;
}

function pruneExpired(currentTime: number) {
  // Opportunistic cleanup for long-running dev/server processes.
  for (const [key, entry] of store) {
    if (entry.resetAt <= currentTime) {
      store.delete(key);
    }
  }
}

export function consumeRateLimit({
  bucket,
  key,
  limit,
  windowMs,
}: ConsumeRateLimitInput): ConsumeRateLimitResult {
  const currentTime = now();
  if (store.size > 1000) {
    pruneExpired(currentTime);
  }

  const storeKey = makeStoreKey(bucket, key);
  const existing = store.get(storeKey);

  if (!existing || existing.resetAt <= currentTime) {
    const resetAt = currentTime + windowMs;
    store.set(storeKey, { count: 1, resetAt });
    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
    };
  }

  existing.count += 1;
  store.set(storeKey, existing);
  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
  };
}
