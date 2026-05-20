export const DEFAULT_ANALYTICS_QUERY_WARN_MS = 500;

export type AnalyticsTimingSample = {
  label: string;
  durationMs: number;
  thresholdMs: number;
  recordedAt: string;
};

export type AnalyticsTimingReport = {
  enabled: boolean;
  thresholdMs: number;
  slowQueries: AnalyticsTimingSample[];
};

const MAX_SAMPLES = 50;
const samples: AnalyticsTimingSample[] = [];

function configuredThresholdMs() {
  const value = Number(process.env.TOKENTRACE_ANALYTICS_QUERY_WARN_MS);
  if (Number.isFinite(value) && value > 0) return value;
  return DEFAULT_ANALYTICS_QUERY_WARN_MS;
}

function timingEnabled() {
  return (
    process.env.TOKENTRACE_ANALYTICS_TIMING === "1" ||
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  );
}

function nowMs() {
  return globalThis.performance?.now() ?? Date.now();
}

export function recordAnalyticsQueryTiming(
  label: string,
  durationMs: number,
  thresholdMs = configuredThresholdMs()
) {
  if (!timingEnabled()) return;
  if (durationMs < thresholdMs) return;

  samples.push({
    label,
    durationMs: Math.round(durationMs),
    thresholdMs,
    recordedAt: new Date().toISOString()
  });

  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

export function timeAnalyticsQuery<T>(label: string, callback: () => T): T {
  if (!timingEnabled()) return callback();
  const startedAt = nowMs();
  try {
    return callback();
  } finally {
    recordAnalyticsQueryTiming(label, nowMs() - startedAt);
  }
}

export function getAnalyticsTimingReport(): AnalyticsTimingReport {
  return {
    enabled: timingEnabled(),
    thresholdMs: configuredThresholdMs(),
    slowQueries: [...samples].sort((a, b) => b.durationMs - a.durationMs)
  };
}

export function resetAnalyticsTimingReport() {
  samples.length = 0;
}
