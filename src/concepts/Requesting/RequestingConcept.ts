import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { exclusions, inclusions } from "./passthrough.ts";
import "jsr:@std/dotenv/load";

/**
 * # Requesting concept configuration
 * The following environment variables are available:
 *
 * - PORT: the port to the server binds, default 10000
 * - REQUESTING_BASE_URL: the base URL prefix for api requests, default "/api"
 * - REQUESTING_TIMEOUT: the timeout for requests, default 10000ms
 * - REQUESTING_SAVE_RESPONSES: whether to persist responses or not, default true
 */
const PORT = parseInt(Deno.env.get("PORT") ?? "8000", 10);
const REQUESTING_BASE_URL = Deno.env.get("REQUESTING_BASE_URL") ?? "/api";
const REQUESTING_TIMEOUT = parseInt(
  Deno.env.get("REQUESTING_TIMEOUT") ?? "10000",
  10,
);

// CORS configuration: Support multiple allowed origins
// Production frontend URL - always allowed
const PRODUCTION_FRONTEND = "https://localloop-frontend.onrender.com";

// Parse allowed origins from environment variable (comma-separated)
// Or use single REQUESTING_ALLOWED_DOMAIN for backward compatibility
const envAllowedDomains = Deno.env.get("REQUESTING_ALLOWED_ORIGINS");
const envSingleDomain = Deno.env.get("REQUESTING_ALLOWED_DOMAIN");

// Build list of allowed origins
const allowedOrigins: string[] = [];

// Always include production frontend
allowedOrigins.push(PRODUCTION_FRONTEND);

// Add origins from REQUESTING_ALLOWED_ORIGINS (comma-separated)
if (envAllowedDomains) {
  const origins = envAllowedDomains.split(",").map((o) => o.trim()).filter((o) =>
    o.length > 0
  );
  allowedOrigins.push(...origins);
}

// Add single domain from REQUESTING_ALLOWED_DOMAIN (backward compatibility)
if (envSingleDomain && !allowedOrigins.includes(envSingleDomain)) {
  allowedOrigins.push(envSingleDomain);
}

// Log the CORS configuration at startup for debugging
console.log(
  `[CORS] Environment variable REQUESTING_ALLOWED_ORIGINS: ${
    envAllowedDomains ?? "(not set)"
  }`,
);
console.log(
  `[CORS] Environment variable REQUESTING_ALLOWED_DOMAIN: ${
    envSingleDomain ?? "(not set)"
  }`,
);
console.log(
  `[CORS] Allowed origins: ${allowedOrigins.join(", ")}`,
);
console.log(
  `[CORS] Production frontend (always allowed): ${PRODUCTION_FRONTEND}`,
);

// Common localhost ports for development
const LOCALHOST_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/\[::1\]:\d+$/, // IPv6 localhost
];

// Choose whether or not to persist responses
const REQUESTING_SAVE_RESPONSES = Deno.env.get("REQUESTING_SAVE_RESPONSES") ??
  true;

const PREFIX = "Requesting" + ".";

// --- Type Definitions ---
type Request = ID;

/**
 * a set of Requests with
 *   an input unknown
 *   an optional response unknown
 */
interface RequestDoc {
  _id: Request;
  input: { path: string; [key: string]: unknown };
  response?: unknown;
  createdAt: Date;
}

/**
 * Represents an in-flight request waiting for a response.
 * This state is not persisted and lives only in memory.
 */
interface PendingRequest {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

/**
 * The Requesting concept encapsulates an API server, modeling incoming
 * requests and outgoing responses as concept actions.
 */
export default class RequestingConcept {
  private readonly requests: Collection<RequestDoc>;
  private readonly pending: Map<Request, PendingRequest> = new Map();
  private readonly timeout: number;

  constructor(private readonly db: Db) {
    this.requests = this.db.collection(PREFIX + "requests");
    this.timeout = REQUESTING_TIMEOUT;
    console.log(
      `\nRequesting concept initialized with a timeout of ${this.timeout}ms.`,
    );
  }

  /**
   * request (path: String, ...): (request: Request)
   * System action triggered by an external HTTP request.
   *
   * **requires** true
   *
   * **effects** creates a new Request `r`; sets the input of `r` to be the path and all other input parameters; returns `r` as `request`
   */
  async request(
    inputs: { path: string; [key: string]: unknown },
  ): Promise<{ request: Request }> {
    const requestId = freshID() as Request;
    const requestDoc: RequestDoc = {
      _id: requestId,
      input: inputs,
      createdAt: new Date(),
    };

    // Persist the request for logging/auditing purposes.
    await this.requests.insertOne(requestDoc);

    // Create an in-memory pending request to manage the async response.
    let resolve!: (value: unknown) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pending.set(requestId, { promise, resolve, reject });

    return { request: requestId };
  }

  /**
   * respond (request: Request, [key: string]: unknown)
   *
   * **requires** a Request with the given `request` id exists and has no response yet
   *
   * **effects** sets the response of the given Request to the provided key-value pairs.
   */
  async respond(
    { request, ...response }: { request: Request; [key: string]: unknown },
  ): Promise<{ request: string }> {
    const pendingRequest = this.pending.get(request);
    if (pendingRequest) {
      // Resolve the promise for any waiting `_awaitResponse` call.
      pendingRequest.resolve(response);
    }

    // Update the persisted request document with the response.
    if (REQUESTING_SAVE_RESPONSES) {
      await this.requests.updateOne({ _id: request }, { $set: { response } });
    }

    return { request };
  }

  /**
   * _awaitResponse (request: Request): (response: unknown)
   *
   * **effects** returns the response associated with the given request, waiting if necessary up to a configured timeout.
   */
  async _awaitResponse(
    { request }: { request: Request },
  ): Promise<{ response: unknown }[]> {
    const pendingRequest = this.pending.get(request);

    if (!pendingRequest) {
      // The request might have been processed already or never existed.
      // We could check the database for a persisted response here if needed.
      throw new Error(
        `Request ${request} is not pending or does not exist: it may have timed-out.`,
      );
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
      // Race the actual response promise against the timeout.
      const response = await Promise.race([
        pendingRequest.promise,
        timeoutPromise,
      ]);
      return [{ response }];
    } finally {
      // Clean up regardless of outcome.
      clearTimeout(timeoutId!);
      this.pending.delete(request);
    }
  }
}

/**
 * Starts the Hono web server that listens for incoming requests and pipes them
 * into the Requesting concept instance. Additionally, it allows passthrough
 * requests to concept actions by default. These should be
 * @param concepts The complete instantiated concepts import from "@concepts"
 */
export function startRequestingServer(
  // deno-lint-ignore no-explicit-any
  concepts: Record<string, any>,
) {
  // deno-lint-ignore no-unused-vars
  const { Requesting, client, db, Engine, ...instances } = concepts;
  if (!(Requesting instanceof RequestingConcept)) {
    throw new Error("Requesting concept missing or broken.");
  }
  const app = new Hono();

  // CORS configuration with support for development and production
  // Helper function to check if an origin is allowed
  const isOriginAllowed = (origin: string | undefined): string | undefined => {
    if (!origin) {
      // Allow requests with no origin (like mobile apps or curl requests)
      // Return the first allowed origin (production frontend)
      return allowedOrigins.length > 0 ? allowedOrigins[0] : PRODUCTION_FRONTEND;
    }

    // Normalize origins (remove trailing slashes and convert to lowercase for comparison)
    const normalizedOrigin = origin.replace(/\/+$/, "").toLowerCase();

    // Check if it matches any of the allowed origins
    for (const allowed of allowedOrigins) {
      const normalizedAllowed = allowed.replace(/\/+$/, "").toLowerCase();
      if (normalizedOrigin === normalizedAllowed) {
        return origin; // Return original origin (with original case)
      }
    }

    // Check if it's a localhost origin (for local development)
    const isLocalhost = LOCALHOST_PATTERNS.some((pattern) =>
      pattern.test(origin)
    );
    if (isLocalhost) {
      return origin;
    }

    return undefined;
  };

  console.log(
    `[CORS] Configured to allow origins: ${allowedOrigins.join(", ")} (and localhost for development)`,
  );

  // Handle OPTIONS requests FIRST to ensure preflight works
  app.options("*", async (c) => {
    const origin = c.req.header("Origin");
    console.log(`[CORS] OPTIONS preflight request from origin: "${origin}"`);

    const allowedOrigin = isOriginAllowed(origin);

    if (allowedOrigin) {
      console.log(
        `[CORS] ✅ OPTIONS preflight allowed for: "${allowedOrigin}"`,
      );
      c.header("Access-Control-Allow-Origin", allowedOrigin);
      c.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      );
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      // Always enable credentials for specific origins (never use wildcard with credentials)
      if (allowedOrigin !== "*") {
        c.header("Access-Control-Allow-Credentials", "true");
      }
      c.header("Access-Control-Max-Age", "86400");
      return c.text("", 204);
    } else {
      console.log(`[CORS] ❌ OPTIONS preflight rejected for: "${origin}"`);
      return c.text("CORS not allowed", 403);
    }
  });

  // Apply CORS middleware to all routes using Hono's CORS middleware
  app.use(
    "*",
    cors({
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposeHeaders: ["Content-Length", "Content-Type", "Authorization"],
      maxAge: 86400,
      origin: (origin: string | undefined): string | undefined => {
        const allowed = isOriginAllowed(origin);
        if (allowed) {
          // console.log(`[CORS] ✅ Allowing origin: "${origin}"`);
        } else {
          console.log(`[CORS] ❌ Rejecting origin: "${origin}"`);
        }
        return allowed;
      },
      // Always enable credentials (we never use wildcard with credentials)
      credentials: true,
    }),
  );

  // Additional middleware to ensure CORS headers are always set on all responses
  // This is a backup in case the CORS middleware doesn't set them for some reason
  app.use("*", async (c, next) => {
    await next();
    const origin = c.req.header("Origin");
    const allowedOrigin = isOriginAllowed(origin);
    if (allowedOrigin) {
      // Only set if not already set by CORS middleware
      if (!c.res.headers.get("Access-Control-Allow-Origin")) {
        c.header("Access-Control-Allow-Origin", allowedOrigin);
        c.header(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        );
        c.header(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-Requested-With",
        );
        // Always enable credentials for specific origins
        if (allowedOrigin !== "*") {
          c.header("Access-Control-Allow-Credentials", "true");
        }
      }
    }
  });

  // Health check endpoint
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      message: "Server is running",
      port: PORT,
      baseUrl: REQUESTING_BASE_URL,
    });
  });

  app.get("/", (c) => {
    return c.json({
      status: "ok",
      message: "Requesting server is running",
      port: PORT,
      baseUrl: REQUESTING_BASE_URL,
      endpoints: {
        health: "/health",
        api: `${REQUESTING_BASE_URL}/*`,
      },
    });
  });

  /**
   * PASSTHROUGH ROUTES
   *
   * These routes register against every concept action and query.
   * While convenient, you should confirm that they are either intentional
   * inclusions and specify a reason, or if they should be excluded and
   * handled by Requesting instead.
   */

  console.log("\nRegistering concept passthrough routes.");
  let unverified = false;
  for (const [conceptName, concept] of Object.entries(instances)) {
    const methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(concept),
    )
      .filter((name) =>
        name !== "constructor" && typeof concept[name] === "function"
      );
    for (const method of methods) {
      const route = `${REQUESTING_BASE_URL}/${conceptName}/${method}`;
      if (exclusions.includes(route)) continue;
      const included = route in inclusions;
      if (!included) unverified = true;
      const msg = included
        ? `  -> ${route}`
        : `WARNING - UNVERIFIED ROUTE: ${route}`;

      app.post(route, async (c) => {
        try {
          const body = await c.req.json().catch(() => ({})); // Handle empty body
          const result = await concept[method](body);
          return c.json(result);
        } catch (e) {
          console.error(`Error in ${conceptName}.${method}:`, e);
          return c.json({ error: "An internal server error occurred." }, 500);
        }
      });
      console.log(msg);
    }
  }
  const passthroughFile = "./src/concepts/Requesting/passthrough.ts";
  if (unverified) {
    console.log(`FIX: Please verify routes in: ${passthroughFile}`);
  }

  /**
   * REQUESTING ROUTES
   *
   * Captures all POST routes under the base URL.
   * The specific action path is extracted from the URL.
   */

  const routePath = `${REQUESTING_BASE_URL}/*`;
  app.post(routePath, async (c) => {
    try {
      const body = await c.req.json();
      if (typeof body !== "object" || body === null) {
        return c.json(
          { error: "Invalid request body. Must be a JSON object." },
          400,
        );
      }

      // Extract the specific action path from the request URL.
      // e.g., if base is /api and request is /api/users/create, path is /users/create
      const actionPath = c.req.path.substring(REQUESTING_BASE_URL.length);

      // Combine the path from the URL with the JSON body to form the action's input.
      const inputs = {
        ...body,
        path: actionPath,
      };

      console.log(`[Requesting] Received request for path: ${inputs.path}`);

      // 1. Trigger the 'request' action.
      const { request } = await Requesting.request(inputs);

      // 2. Await the response via the query. This is where the server waits for
      //    synchronizations to trigger the 'respond' action.
      const responseArray = await Requesting._awaitResponse({ request });

      // 3. Send the response back to the client.
      const { response } = responseArray[0];
      return c.json(response);
    } catch (e) {
      if (e instanceof Error) {
        console.error(`[Requesting] Error processing request:`, e.message);
        if (e.message.includes("timed out")) {
          return c.json({ error: "Request timed out." }, 504); // Gateway Timeout
        }
        return c.json({ error: "An internal server error occurred." }, 500);
      } else {
        return c.json({ error: "unknown error occurred." }, 418);
      }
    }
  });

  console.log(
    `\n🚀 Requesting server listening for POST requests at base path of ${routePath}`,
  );
  console.log(`\n📡 Server Configuration:`);
  console.log(`   - Port: ${PORT}`);
  console.log(`   - Base URL: ${REQUESTING_BASE_URL}`);
  console.log(`   - CORS Origins: ${allowedOrigins.join(", ")}`);
  console.log(`   - Credentials: enabled`);
  console.log(`   - Health Check: http://localhost:${PORT}/health`);
  console.log(`   - API Base: http://localhost:${PORT}${REQUESTING_BASE_URL}`);

  // Bind to 0.0.0.0 to accept connections from external hosts (required for production)
  Deno.serve({ port: PORT, hostname: "0.0.0.0" }, app.fetch);
  console.log(`\n✅ Server is ready and listening on http://0.0.0.0:${PORT}`);
  console.log(
    `   Frontend should connect to: http://localhost:${PORT}${REQUESTING_BASE_URL}\n`,
  );
}
