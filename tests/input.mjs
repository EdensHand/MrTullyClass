import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const lessonsJs = fs.readFileSync("assignments.js", "utf8");

assert.ok(html.includes('id="terminal-input-form"') && html.includes('id="terminal-input"'));
assert.ok(html.includes('id="terminal-cancel"') && html.includes('id="node-stop"'));
assert.ok(!html.includes('id="js-runtime-mode"'), "No runtime menu should be shown");
assert.ok(!html.includes('id="preview-frame"'), "Do not ship a second, browser-based runtime");
assert.ok(!app.includes("readLine(") && !app.includes("readInt(") && !app.includes("readFloat("),
  "The page must not provide proprietary input functions");

assert.ok(app.includes('new WebSocket(socketUrl)'));
assert.ok(app.includes('type: "run", code, token: nodeAccessKey'));
assert.ok(app.includes('type: "stdin", value'));
assert.ok(app.includes('msg.type === "stdout" || msg.type === "stderr"'));
assert.ok(app.includes('if (!runnerAvailable)') && app.includes("nodeAccessKey"));
assert.ok(app.includes('if (!isRunnableLesson(currentLesson)) return;'));

const env = { window: {} };
vm.runInNewContext(lessonsJs, env, { filename: "assignments.js" });
const lessons = Array.from(env.window.MT_ASSIGNMENTS);
const promptLesson = lessons.find(lesson => lesson.id === "csf-user-input");
assert.ok(promptLesson);
assert.ok(promptLesson.code.includes('require("node:readline/promises")'),
  "Starter input exercise should use standard Node.js readline");
assert.ok(promptLesson.code.includes("process.stdin"));
assert.ok(!promptLesson.code.includes("readLine(") &&
          !promptLesson.code.includes("readInt("),
  "Starter code must not rely on the old browser-only helpers");
new vm.Script(promptLesson.code, { filename: "csf-user-input.js" });
console.log("Single-runtime terminal tests passed.");
