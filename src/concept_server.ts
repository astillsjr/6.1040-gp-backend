import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { getDb } from "@utils/database.ts";
import { walk } from "jsr:@std/fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { toFileUrl } from "jsr:@std/path/to-file-url";
import "jsr:@std/dotenv/load";

// Parse command-line args
const envPort = Deno.env.get("PORT");
const flags = parseArgs(Deno.args, {
  string: ["port", "baseUrl"],
  default: {
    port: envPort ?? "10000",
    baseUrl: "/api",
  },
});

const PORT = Number(flags.port) || 10000;
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
    if (trimmed.length > 0) allowedOrigins.add(trimmed);
  }
}

if (envSingleDomain) allowedOrigins.add(envSingleDomain);

const allowedOriginsList = Array.from(allowedOrigins);

// localhost patterns
const LOCALHOST_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/\[::1\]:\d+$/,
];

const isOriginAllowed = (origin: string | undefined): string | undefined => {
  if (!origin) return allowedOriginsList[0] ?? PRODUCTION_FRONTEND;

  const normalizedOrigin = origin.replace(/\/+$/, "").toLowerCase();

  for (const allowed of allowedOriginsList) {
    if (normalizedOrigin === allowed.replace(/\/+$/, "").toLowerCase()) {
      return origin;
    }
  }

  if (LOCALHOST_PATTERNS.some((p) => p.test(origin))) return origin;

  return undefined;
};

console.log(`[CORS] Allowed origins: ${allowedOriginsList.join(", ")}`);

// --- Main server ---
async function main() {
  const [db] = await getDb();
  const app = new Hono();

  // --- OPTIONS preflight handler ---
  app.options("*", (c) => {
    const origin = c.req.header("Origin");
    const allowed = isOriginAllowed(origin);

    if (allowed) {
      const resp = c.status(204); // no body
      resp.header("Access-Control-Allow-Origin", allowed);
      resp.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      );
      resp.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With",
      );
      resp.header("Access-Control-Allow-Credentials", "true");
      resp.header("Access-Control-Max-Age", "86400");
      return resp;
    }

    return c.text("CORS not allowed", 403);
  });

  // --- CORS middleware for all routes ---
  app.use(
    "*",
    cors({
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposeHeaders: ["Content-Length", "Content-Type", "Authorization"],
      maxAge: 86400,
      credentials: true,
      origin: (origin) => isOriginAllowed(origin),
    }),
  );

  // Backup middleware to ensure headers
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
      c.header("Access-Control-Allow-Credentials", "true");
    }
  });

  // Health check
  app.get("/", (c) => c.text("Concept Server is running."));

  // --- Dynamic concept loading ---
  console.log(`Scanning for concepts in ./${CONCEPTS_DIR}...`);
  for await (
    const entry of walk(CONCEPTS_DIR, {
      maxDepth: 1,
      includeDirs: true,
      includeFiles: false,
    })
  ) {
    if (entry.path === CONCEPTS_DIR) continue;

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
          `! No valid concept class in ${conceptFilePath}, skipping.`,
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
        const route = `${BASE_URL}/${conceptApiName}/${methodName}`;
        app.post(route, async (c) => {
          try {
            const body = await c.req.json().catch(() => ({}));
            const result = await instance[methodName](body);
            return c.json(result);
          } catch (e) {
            console.error(`Error in ${conceptName}.${methodName}:`, e);
            return c.json({ error: "Internal server error." }, 500);
          }
        });
        console.log(`  - Endpoint: POST ${route}`);
      }
    } catch (e) {
      console.error(`! Error loading concept from ${conceptFilePath}:`, e);
    }
  }

  console.log(`\nServer listening on http://localhost:${PORT}`);
  Deno.serve({ port: PORT }, app.fetch);
}

main();
