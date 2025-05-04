import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { existsSync } from "fs";
import { kill } from "process";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  const startServer = () => {
    server.listen(
      {
        port: PORT,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${PORT}`);
      }
    );
  };

  const killExistingProcess = async () => {
    try {
      const { exec } = require("child_process");
      const { stdout, stderr } = await new Promise((resolve, reject) => {
        exec(
          `lsof -i :${PORT} | grep LISTEN | awk '{print $2}'`,
          (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          }
        );
      });
      if (stdout.trim()) {
        const pids = stdout.trim().split("\n");
        await Promise.all(
          pids.map(
            (pid) =>
              new Promise((resolve, reject) => {
                kill(parseInt(pid), "SIGKILL", (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              })
          )
        );
      }
    } catch (error) {
      console.error("Error killing existing process:", error);
    }
  };

  try {
    await killExistingProcess();
    startServer();
  } catch (error) {
    console.error("Failed to start server:", error);
  }
})();
