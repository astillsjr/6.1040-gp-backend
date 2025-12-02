import { Hono } from "jsr:@hono/hono";
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { exclusions, inclusions } from "./passthrough.ts";
import "jsr:@std/dotenv/load";

/** --- Config --- */
const PORT = Number(Deno.env.get("PORT")) || 10000;
const REQUESTING_BASE_URL = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const REQUESTING_TIMEOUT = parseInt(
  Deno.env.get("REQUESTING_TIMEOUT") ?? "10000",
  10,
);
const REQUESTING_SAVE_RESPONSES = Deno.env.get("REQUESTING_SAVE_RESPONSES") ??
  true;

const PRODUCTION_FRONTEND = "https://localloop-frontend.onrender.com";
const envAllowedDomains = Deno.env.get("REQUESTING_ALLOWED_ORIGINS");
const envSingleDomain = Deno.env.get("REQUESTING_ALLOWED_DOMAIN");

const allowedOrigins = new Set<string>();
allowedOrigins.add(PRODUCTION_FRONTEND);
if (envAllowedDomains) {
  for (const origin of envAllowedDomains.split(",")) {
    const trimmed = origin.trim();
    if (trimmed.length > 0) allowedOrigins.add(trimmed);
  }
}
if (envSingleDomain) allowedOrigins.add(envSingleDomain);

const LOCALHOST_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/\[::1\]:\d+$/,
];

const isOriginAllowed = (origin: string | undefined): string | undefined => {
  if (!origin) return Array.from(allowedOrigins)[0] ?? PRODUCTION_FRONTEND;

  const normalizedOrigin = origin.replace(/\/+$/, "").toLowerCase();
  for (const allowed of allowedOrigins) {
    if (normalizedOrigin === allowed.replace(/\/+$/, "").toLowerCase()) {
      return origin;
    }
  }
  const isLocalhost = LOCALHOST_PATTERNS.some((pattern) =>
    pattern.test(origin)
  );
  return isLocalhost ? origin : undefined;
};

/** --- Types --- */
type Request = ID;

interface RequestDoc {
  _id: Request;
  input: { path: string; [key: string]: unknown };
  response?: unknown;
  createdAt: Date;
}

interface PendingRequest {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

/** --- Requesting Concept --- */
export default class RequestingConcept {
  private readonly requests: Collection<RequestDoc>;
  private readonly pending: Map<Request, PendingRequest> = new Map();
  private readonly timeout: number;

  constructor(private readonly db: Db) {
    this.requests = this.db.collection("Requesting.requests");
    this.timeout = REQUESTING_TIMEOUT;
    console.log(
      `\nRequesting concept initialized with timeout ${this.timeout}ms.`,
    );
  }

  async request(
    inputs: { path: string; [key: string]: unknown },
  ): Promise<{ request: Request }> {
    const requestId = freshID() as Request;
    const requestDoc: RequestDoc = {
      _id: requestId,
      input: inputs,
      createdAt: new Date(),
    };
    await this.requests.insertOne(requestDoc);

    let resolve!: (v: unknown) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pending.set(requestId, { promise, resolve, reject });
    return { request: requestId };
  }

  async respond(
    { request, ...response }: { request: Request; [key: string]: unknown },
  ): Promise<{ request: string }> {
    const pending = this.pending.get(request);
    if (pending) pending.resolve(response);

    if (REQUESTING_SAVE_RESPONSES) {
      await this.requests.updateOne({ _id: request }, { $set: { response } });
    }

    return { request };
  }

  async _awaitResponse(
    { request }: { request: Request },
  ): Promise<{ response: unknown }[]> {
    const pending = this.pending.get(request);
    if (!pending) {
      throw new Error(`Request ${request} is not pending or does not exist.`);
    }

    let timeoutId: number;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () =>
          reject(
            new Error(`Request ${request} timed out after ${this.timeout}ms`),
          ),
        this.timeout,
      );
    });

    try {
      const response = await Promise.race([pending.promise, timeoutPromise]);
      return [{ response }];
    } finally {
      clearTimeout(timeoutId!);
      this.pending.delete(request);
    }
  }
}

/** --- Requesting Server --- */
export function startRequestingServer(concepts: Record<string, any>) {
  const { Requesting, ...instances } = concepts;
  if (!(Requesting instanceof RequestingConcept)) {
    throw new Error("Requesting concept missing or broken.");
  }

  const app = new Hono();

  // --- Global CORS + OPTIONS preflight ---
  app.use("*", async (c, next) => {
    const origin = c.req.header("Origin");
    const allowedOrigin = isOriginAllowed(origin);

    if (c.req.method === "OPTIONS") {
      if (allowedOrigin) {
        return c.text("", 204, {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, DELETE, OPTIONS, PATCH",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        });
      } else {
        return c.text("CORS not allowed", 403);
      }
    }

    const resp = await next();

    if (allowedOrigin && !c.res.headers.get("Access-Control-Allow-Origin")) {
      c.header("Access-Control-Allow-Origin", allowedOrigin);
      c.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      );
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      c.header("Access-Control-Allow-Credentials", "true");
    }

    return resp;
  });

  app.get(
    "/",
    (c) =>
      c.json({
        status: "ok",
        message: "Requesting server running",
        port: PORT,
      }),
  );
  app.get("/health", (c) => c.json({ status: "ok", port: PORT }));

  // --- PASSTHROUGH ROUTES ---
  console.log("\nRegistering concept passthrough routes.");
  for (const [conceptName, concept] of Object.entries(instances)) {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(concept))
      .filter((name) =>
        name !== "constructor" && typeof concept[name] === "function"
      );

    for (const method of methods) {
      const route = `${REQUESTING_BASE_URL}/${conceptName}/${method}`;
      if (exclusions.includes(route)) continue;

      app.post(route, async (c) => {
        try {
          const body = await c.req.json().catch(() => ({}));
          const result = await concept[method](body);
          return c.json(result);
        } catch (e) {
          console.error(`Error in ${conceptName}.${method}:`, e);
          return c.json({ error: "An internal server error occurred." }, 500);
        }
      });
      console.log(`  -> ${route}`);
    }
  }

  // --- REQUESTING ROUTES ---
  app.post(`${REQUESTING_BASE_URL}/*`, async (c) => {
    try {
      const body = await c.req.json();
      if (!body || typeof body !== "object") {
        return c.json({ error: "Invalid request body" }, 400);
      }

      const actionPath = c.req.path.substring(REQUESTING_BASE_URL.length);
      const inputs = { ...body, path: actionPath };

      console.log(`[Requesting] Received request for path: ${inputs.path}`);
      const { request } = await Requesting.request(inputs);
      const responseArray = await Requesting._awaitResponse({ request });
      const { response } = responseArray[0];

      return c.json(response);
    } catch (e) {
      console.error("[Requesting] Error processing request:", e);
      if (e instanceof Error && e.message.includes("timed out")) {
        return c.json({ error: "Request timed out." }, 504);
      }
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  console.log(
    `\n🚀 Requesting server listening on http://0.0.0.0:${PORT}${REQUESTING_BASE_URL}`,
  );
  Deno.serve({ port: PORT, hostname: "0.0.0.0" }, app.fetch);
}
