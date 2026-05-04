type RequestSample = {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
};

type SlowQuerySample = {
  model: string;
  operation: string;
  durationMs: number;
  query: Record<string, unknown>;
  timestamp: string;
};

type QueryContext = {
  model: string;
  operation: string;
  query: Record<string, unknown>;
};

type RequestContext = {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
};

const MAX_REQUEST_SAMPLES = 500;
const MAX_SLOW_QUERY_SAMPLES = 100;
const SLOW_REQUEST_THRESHOLD_MS = 300;
const SLOW_QUERY_THRESHOLD_MS = 200;

const requestSamples: RequestSample[] = [];
const slowQuerySamples: SlowQuerySample[] = [];
let totalRequests = 0;
let slowRequestCount = 0;

const requestCountsByStatus = new Map<number, number>();
const requestCountsByEndpoint = new Map<string, number>();
const requestDurations: number[] = [];

const keyForEndpoint = (method: string, path: string) => `${method.toUpperCase()} ${path}`;

const average = (values: number[]) => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const percentile = (values: number[], percentileValue: number) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
};

export class ObservabilityService {
  static recordRequest(context: RequestContext) {
    const endpointKey = keyForEndpoint(context.method, context.path);

    totalRequests += 1;

    requestCountsByStatus.set(
      context.statusCode,
      (requestCountsByStatus.get(context.statusCode) || 0) + 1
    );
    requestCountsByEndpoint.set(endpointKey, (requestCountsByEndpoint.get(endpointKey) || 0) + 1);
    requestDurations.push(context.durationMs);

    if (context.durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
      slowRequestCount += 1;
    }

    requestSamples.push({
      method: context.method.toUpperCase(),
      path: context.path,
      statusCode: context.statusCode,
      durationMs: context.durationMs,
      timestamp: new Date().toISOString(),
    });

    if (requestSamples.length > MAX_REQUEST_SAMPLES) {
      requestSamples.shift();
    }
  }

  static recordSlowQuery(context: QueryContext, durationMs: number) {
    if (durationMs < SLOW_QUERY_THRESHOLD_MS) {
      return;
    }

    slowQuerySamples.push({
      model: context.model,
      operation: context.operation,
      durationMs,
      query: context.query,
      timestamp: new Date().toISOString(),
    });

    if (slowQuerySamples.length > MAX_SLOW_QUERY_SAMPLES) {
      slowQuerySamples.shift();
    }
  }

  static getMetrics() {
    const topEndpoints = [...requestCountsByEndpoint.entries()]
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10);

    const recentSlowRequests = requestSamples
      .filter(sample => sample.durationMs >= SLOW_REQUEST_THRESHOLD_MS)
      .slice(-20);

    return {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      totalRequests,
      averageRequestDurationMs: Number(average(requestDurations).toFixed(2)),
      p95RequestDurationMs: percentile(requestDurations, 95),
      requestCountsByStatus: Object.fromEntries(requestCountsByStatus.entries()),
      topEndpoints,
      slowRequestThresholdMs: SLOW_REQUEST_THRESHOLD_MS,
      slowRequestCount,
      recentSlowRequests,
      slowQueries: slowQuerySamples.slice(-20),
      slowQueryThresholdMs: SLOW_QUERY_THRESHOLD_MS,
      generatedAt: new Date().toISOString(),
    };
  }

  static getSlowQueryThresholdMs() {
    return SLOW_QUERY_THRESHOLD_MS;
  }

  static getQueryContextFromOperation(operation: string, modelName: string, query: unknown): QueryContext {
    const normalizedQuery =
      query && typeof query === 'object' ? (query as Record<string, unknown>) : { value: query as unknown };

    return {
      model: modelName,
      operation,
      query: normalizedQuery,
    };
  }
}