const REDACTED_REQUEST_HEADER_KEYS = new Set(["authorization", "cookie"]);
const REDACTED_RESPONSE_HEADER_KEYS = new Set(["set-cookie"]);
const REDACTED_REQUEST_BODY_KEYS = new Set(["password", "token", "access_token", "refresh_token"]);
const REDACTED_RESPONSE_BODY_KEYS = new Set(["password", "token", "access_token", "refresh_token"]);
const REDACTED_VALUE = "[REDACTED]";
const MAX_DEPTH_EXCEEDED = "[MaxDepth]";
const LOG_MAX_DEPTH = 10;

function isRedactedKey(key: string, redactedKeys: ReadonlySet<string>): boolean {
  return redactedKeys.has(key.toLowerCase());
}

function redactLogValue(params: {
  value: unknown;
  redactedKeys: ReadonlySet<string>;
  maxDepth: number;
  depth?: number;
}): unknown {
  const { value, redactedKeys, maxDepth, depth = 0 } = params;

  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (depth >= maxDepth) {
    return MAX_DEPTH_EXCEEDED;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      redactLogValue({
        value: item,
        redactedKeys,
        maxDepth,
        depth: depth + 1,
      })
    );
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      isRedactedKey(key, redactedKeys)
        ? REDACTED_VALUE
        : redactLogValue({
            value: nested,
            redactedKeys,
            maxDepth,
            depth: depth + 1,
          }),
    ])
  );
}

function redactRequestHeaders(req: { header: () => Record<string, string> }) {
  return redactLogValue({ value: req.header(), redactedKeys: REDACTED_REQUEST_HEADER_KEYS, maxDepth: LOG_MAX_DEPTH });
}

function redactResponseHeaders(res: Response) {
  return redactLogValue({
    value: Object.fromEntries(res.headers.entries()),
    redactedKeys: REDACTED_RESPONSE_HEADER_KEYS,
    maxDepth: LOG_MAX_DEPTH,
  });
}

function redactRequestBody(value: unknown) {
  return redactLogValue({ value, redactedKeys: REDACTED_REQUEST_BODY_KEYS, maxDepth: LOG_MAX_DEPTH });
}

function redactResponseBody(value: unknown) {
  return redactLogValue({ value, redactedKeys: REDACTED_RESPONSE_BODY_KEYS, maxDepth: LOG_MAX_DEPTH });
}

function unsupportedBodyLabel(contentType: string): string {
  return `[${contentType || "unknown"}]`;
}

async function readBodyForLog(params: {
  contentType: string;
  readJson: () => Promise<unknown>;
  readText: () => Promise<string>;
}): Promise<unknown> {
  const { contentType, readJson, readText } = params;

  if (contentType.includes("application/json")) {
    try {
      return await readJson();
    } catch {
      return undefined;
    }
  }

  if (contentType.includes("text/plain")) {
    try {
      return await readText();
    } catch {
      return undefined;
    }
  }

  return unsupportedBodyLabel(contentType);
}

async function readRequestBody(ctx: {
  req: { method: string; header: (name: string) => string | undefined; raw: Request };
}) {
  if (ctx.req.method === "GET" || ctx.req.method === "HEAD") {
    return undefined;
  }

  const contentType = ctx.req.header("content-type") ?? "";

  return readBodyForLog({
    contentType,
    readJson: () => ctx.req.raw.clone().json(),
    readText: () => ctx.req.raw.clone().text(),
  });
}

async function readResponseBody(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";

  return readBodyForLog({
    contentType,
    readJson: () => res.clone().json(),
    readText: () => res.clone().text(),
  });
}

export {
  readRequestBody,
  readResponseBody,
  redactRequestBody,
  redactRequestHeaders,
  redactResponseBody,
  redactResponseHeaders,
};
