import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { getDb } from "@utils/database.ts";
import { walk } from "jsr:@std/fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { toFileUrl } from "jsr:@std/path/to-file-url";
import "jsr:@std/dotenv/load";

// Parse command-line arguments for port and base URL
const flags = parseArgs(Deno.args, {
  string: ["port", "baseUrl"],
  default: {
    port: "8000",
    baseUrl: "/api",
  },
});

const PORT = parseInt(flags.port, 10);
const BASE_URL = flags.baseUrl;
const CONCEPTS_DIR = "src/concepts";

// --- CORS configuration ---
const PRODUCTION_FRONTEND = "https://localloop-frontend.onrender.com";
const envAllowedDomains = Deno.env.get("REQUESTING_ALLOWED_ORIGINS");
const envSingleDomain = Deno.env.get("REQUESTING_ALLOWED_DOMAIN");
const allowedOrigins = new Set<string>();
allowedOrigins.add(PRODUCTION_FRONTEND);

if (envAllowedDomains) {
  for (const origin of envAllowedDomains.split(",")) {
    const trimmed = origin.trim();
    if (trimmed.length > 0) {
      allowedOrigins.add(trimmed);
    }
  }
}

if (envSingleDomain) {
  allowedOrigins.add(envSingleDomain);
}

const allowedOriginsList = Array.from(allowedOrigins);

// Common localhost patterns for dev
const LOCALHOST_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/\[::1\]:\d+$/,
];

const isOriginAllowed = (origin: string | undefined): string | undefined => {
  if (!origin) {
    return allowedOriginsList[0] ?? PRODUCTION_FRONTEND;
  }

  const normalizedOrigin = origin.replace(/\/+$/, "").toLowerCase();

  for (const allowed of allowedOriginsList) {
    const normalizedAllowed = allowed.replace(/\/+$/, "").toLowerCase();
    if (normalizedOrigin === normalizedAllowed) {
      return origin;
    }
  }

  const isLocalhost = LOCALHOST_PATTERNS.some((pattern) => pattern.test(origin));
  if (isLocalhost) return origin;

  return undefined;
};

console.log(
  `[CORS] Allowed origins (concept_server): ${allowedOriginsList.join(", ")}`,
);

/**
 * Main server function to initialize DB, load concepts, and start the server.
 */
async function main() {
  const [db] = await getDb();
  const app = new Hono();

  // Handle OPTIONS preflight before routes
  app.options("*", (c) => {
    const origin = c.req.header("Origin");
    const allowed = isOriginAllowed(origin);
    if (allowed) {
      c.header("Access-Control-Allow-Origin", allowed);
      c.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      );
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      if (allowed !== "*") {
        c.header("Access-Control-Allow-Credentials", "true");
      }
      c.header("Access-Control-Max-Age", "86400");
      return c.text("", 204);
    }
    return c.text("CORS not allowed", 403);
  });

  app.use(
    "*",
    cors({
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposeHeaders: ["Content-Length", "Content-Type", "Authorization"],
      maxAge: 86400,
      credentials: true,
      origin: (origin) => {
        const allowed = isOriginAllowed(origin);
        if (!allowed) {
          console.log(`[CORS] Rejecting origin (concept_server): ${origin}`);
        }
        return allowed;
      },
    }),
  );

  app.use("*", async (c, next) => {
    await next();
    const origin = c.req.header("Origin");
    const allowed = isOriginAllowed(origin);
    if (allowed && !c.res.headers.get("Access-Control-Allow-Origin")) {
      c.header("Access-Control-Allow-Origin", allowed);
      c.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      );
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      if (allowed !== "*") {
        c.header("Access-Control-Allow-Credentials", "true");
      }
    }
  });

  app.get("/", (c) => c.text("Concept Server is running."));

  // --- Dynamic Concept Loading and Routing ---
  console.log(`Scanning for concepts in ./${CONCEPTS_DIR}...`);

  for await (
    const entry of walk(CONCEPTS_DIR, {
      maxDepth: 1,
      includeDirs: true,
      includeFiles: false,
    })
  ) {
    if (entry.path === CONCEPTS_DIR) continue; // Skip the root directory

    const conceptName = entry.name;
    const conceptFilePath = `${entry.path}/${conceptName}Concept.ts`;

    try {
      const modulePath = toFileUrl(Deno.realPathSync(conceptFilePath)).href;
      const module = await import(modulePath);
      const ConceptClass = module.default;

      if (
        typeof ConceptClass !== "function" ||
        !ConceptClass.name.endsWith("Concept")
      ) {
        console.warn(
          `! No valid concept class found in ${conceptFilePath}. Skipping.`,
        );
        continue;
      }

      const instance = new ConceptClass(db);
      const conceptApiName = conceptName;
      console.log(
        `- Registering concept: ${conceptName} at ${BASE_URL}/${conceptApiName}`,
      );

      const methodNames = Object.getOwnPropertyNames(
        Object.getPrototypeOf(instance),
      )
        .filter((name) =>
          name !== "constructor" && typeof instance[name] === "function"
        );

      for (const methodName of methodNames) {
        const actionName = methodName;
        const route = `${BASE_URL}/${conceptApiName}/${actionName}`;

        app.post(route, async (c) => {
          try {
            const body = await c.req.json().catch(() => ({})); // Handle empty body
            const result = await instance[methodName](body);
            return c.json(result);
          } catch (e) {
            console.error(`Error in ${conceptName}.${methodName}:`, e);
            return c.json({ error: "An internal server error occurred." }, 500);
          }
        });
        console.log(`  - Endpoint: POST ${route}`);
      }
    } catch (e) {
      console.error(
        `! Error loading concept from ${conceptFilePath}:`,
        e,
      );
    }
  }

  console.log(`\nServer listening on http://localhost:${PORT}`);
  Deno.serve({ port: PORT }, app.fetch);
}

// Run the server
main();
