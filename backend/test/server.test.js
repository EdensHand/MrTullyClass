"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createAppServer } = require("../server");

async function withServer(run) {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run("http://127.0.0.1:" + port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test("GET /health returns JSON status", async () => {
  await withServer(async (url) => {
    const response = await fetch(url + "/health");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.deepEqual(await response.json(), {
      status: "ok", service: "mrtullyclass-backend"
    });
  });
});

test("GET / also returns a harmless readiness response", async () => {
  await withServer(async (url) => {
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "ok");
  });
});

test("only MrTullyClass GitHub Pages origin receives a CORS allowance", async () => {
  await withServer(async (url) => {
    const allowed = await fetch(url + "/health", {
      headers: { Origin: "https://edenshand.github.io" }
    });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://edenshand.github.io");

    const denied = await fetch(url + "/health", {
      headers: { Origin: "https://other-site.example" }
    });
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
  });
});

test("POST requests cannot execute or submit JavaScript", async () => {
  await withServer(async (url) => {
    const response = await fetch(url + "/health", {
      method: "POST",
      headers: { "Content-Type": "application/javascript" },
      body: "console.log('not executed')"
    });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
    const missing = await fetch(url + "/execute", { method: "POST", body: "1 + 1" });
    assert.equal(missing.status, 404);
  });
});

test("HEAD /health sends headers without a response body", async () => {
  await withServer(async (url) => {
    const response = await fetch(url + "/health", { method: "HEAD" });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "");
  });
});
