"use strict";

const http = require("node:http");

// Health-check-only API. This server must never evaluate student code.
const SERVICE = "mrtullyclass-backend";
const ALLOWED_ORIGIN = "https://edenshand.github.io";

function createAppServer() {
  return http.createServer((req, res) => {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Vary": "Origin"
    };

    // Allow health checks from the existing GitHub Pages frontend.
    // No credentials, and no arbitrary origins.
    if (req.headers.origin === ALLOWED_ORIGIN) {
      headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
    }

    const path = req.url?.split("?")[0];
    if (path !== "/" && path !== "/health") {
      res.writeHead(404, headers);
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { ...headers, Allow: "GET, HEAD" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const body = JSON.stringify({ status: "ok", service: SERVICE });
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 10000);
  const server = createAppServer();
  server.listen(port, "0.0.0.0", () => {
    console.log(SERVICE + " listening on port " + port);
  });

  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
}

module.exports = { createAppServer };
