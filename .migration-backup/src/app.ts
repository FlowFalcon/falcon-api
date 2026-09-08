import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _require = createRequire(import.meta.url);

// Stats persistence
global.startTime = global.startTime || Date.now();
global.totalreq = global.totalreq || 0;

// Load helper globals from function.cjs
const functionPath = path.resolve(__dirname, "../function.cjs");
if (fs.existsSync(functionPath)) {
  try {
    _require(functionPath);
  } catch (_e) {}
}

// Load settings
const settingsPath = path.resolve(__dirname, "../assets/settings.json");
let settings: Record<string, any> = {};
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
  (global as any).apikey = settings.apiSettings?.apikey || [];
} catch (_e) {}

const app: Express = express();

// Set up multer globally for routes that need it
try {
  const multer = _require("multer");
  const upload = multer({ storage: multer.memoryStorage() });
  (global as any).upload = upload;
} catch (_e) {}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("json spaces", 2);

// Inject creator field into all JSON responses
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = function (data: unknown) {
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const creator = settings.apiSettings?.creator || "Axly API";
      return originalJson({ ...(data as object), creator });
    }
    return originalJson(data);
  };
  next();
});

// Serve static asset files
const assetsDir = path.resolve(__dirname, "../assets");
const publicDir = path.resolve(__dirname, "../public");

if (fs.existsSync(assetsDir)) {
  app.use("/assets", express.static(assetsDir));
}
if (fs.existsSync(path.join(publicDir, "assets"))) {
  app.use("/assets", express.static(path.join(publicDir, "assets")));
}
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { index: false }));
}

// Stats endpoint
app.get("/stats", (_req: Request, res: Response) => {
  res.json({
    status: true,
    totalRequests: (global as any).totalreq || 0,
    startTime: (global as any).startTime,
    runtime: Date.now() - ((global as any).startTime || Date.now()),
    uptime: process.uptime(),
  });
});

// Settings endpoint
app.get("/settings", (_req: Request, res: Response) => {
  res.json(settings);
});

// Notifications endpoint
app.get("/notifications", (_req: Request, res: Response) => {
  try {
    const notifsPath = path.resolve(__dirname, "../api-page/notifications.json");
    const notifs = JSON.parse(fs.readFileSync(notifsPath, "utf-8"));
    res.json(notifs);
  } catch (_e) {
    res.json([]);
  }
});

// Dynamically load all CJS API route handlers from src/api/
const apiFolder = path.resolve(__dirname, "../src/api");
if (fs.existsSync(apiFolder)) {
  let loaded = 0;
  fs.readdirSync(apiFolder).forEach((subfolder) => {
    const subfolderPath = path.join(apiFolder, subfolder);
    if (fs.statSync(subfolderPath).isDirectory()) {
      fs.readdirSync(subfolderPath).forEach((file) => {
        const filePath = path.join(subfolderPath, file);
        if (path.extname(file) === ".cjs") {
          try {
            _require(filePath)(app);
            loaded++;
          } catch (e: unknown) {
            logger.warn({ err: e }, `Skipped route: ${file}`);
          }
        }
      });
    }
  });
  logger.info({ loaded }, "API routes loaded");
}

// Health check routes
app.use("/api", router);

// Landing page
app.get("/", (_req: Request, res: Response) => {
  const indexPath = path.resolve(__dirname, "../public/index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ status: true, message: "Axly API is running", version: settings.version || "v2.0" });
  }
});

app.get("/home", (_req: Request, res: Response) => res.redirect("/"));

// API docs page
app.get("/docs", (_req: Request, res: Response) => {
  const docsPath = path.resolve(__dirname, "../api-page/index.html");
  if (fs.existsSync(docsPath)) {
    res.sendFile(docsPath);
  } else {
    res.redirect("/");
  }
});

// 404 fallback
app.use((_req: Request, res: Response) => {
  const notFoundPath = path.resolve(__dirname, "../api-page/404.html");
  if (fs.existsSync(notFoundPath)) {
    res.status(404).sendFile(notFoundPath);
  } else {
    res.status(404).json({ status: false, error: "Not Found" });
  }
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err });
  const errPath = path.resolve(__dirname, "../api-page/500.html");
  if (fs.existsSync(errPath)) {
    res.status(500).sendFile(errPath);
  } else {
    res.status(500).json({ status: false, error: "Internal Server Error" });
  }
});

export default app;
