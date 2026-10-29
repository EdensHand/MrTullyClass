import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// The input protocol must accept arbitrary responses, not hardcoded choices.
const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const assignments = fs.readFileSync("assignments.js", "utf8");
assert.ok(html.includes('id="terminal-input-form"') && html.includes('id="terminal-input"'));
assert.ok(html.includes('id="terminal-cancel"'));
assert.ok(css.includes(".terminal-input-form"));
assert.ok(app.includes("requestTerminalInput(data)") && app.includes("submitTerminalInput(cancelled)"));
assert.ok(app.includes("mt-class-input-response") && app.includes('type=\\\"module\\\"'), "ES module execution should use browser engine");
assert.ok(app.includes("const studentScript") && app.includes("safeCode") && app.includes('mode === "classic"'), "Native unwrapped classic and module execution modes required");
assert.ok(!app.includes("async function __mtStudentMain()"), "Student code must not be wrapped in a synthetic async function");
assert.ok(html.includes('id="js-runtime-mode"'), "Mode selector must be available");
assert.ok(assignments.includes('id: "csf-user-input"'));

const sourceMatch = app.match(/    const bridge = \[([\s\S]*?)\n    \]\.join\("\\n"\);/);
assert.ok(sourceMatch, "Unable to locate browser input bridge");

const token = JSON.stringify("test-run");
const bridgeSource = vm.runInNewContext("[" + sourceMatch[1] + '].join("\\n")', { token });
const posted = [];
let messageListener;
const parent = { postMessage(message) { posted.push(message); } };
const context = {
  parent,
  window: {
    addEventListener(eventName, fn) {
      if (eventName === "message") messageListener = fn;
    }
  },
  console: { log() {}, warn() {}, error() {} }
};
vm.runInNewContext(bridgeSource, context, { timeout: 1000 });

function respond(value, options = {}) {
  const request = [...posted].reverse().find(msg => msg.type === "input-request");
  assert.ok(request, "Expected an input request");
  messageListener({ source: parent, data: {
    kind: "mt-class-input-response",
    token: "test-run",
    requestId: request.requestId,
    cancelled: false,
    value,
    ...options
  } });
  return request;
}
const wordPromise = vm.runInNewContext('readLine("Tell me your favorite word:")', context);
assert.equal(posted.at(-1).value, "Tell me your favorite word:");
respond("Purple marmalade 99!");
assert.equal(await wordPromise, "Purple marmalade 99!");

const numPromise = vm.runInNewContext('readInt("Whole number?")', context);
const first = posted.at(-1).requestId;
respond("not a number");
await new Promise(resolve => setImmediate(resolve));
assert.ok(posted.some(m => m.value === "Please enter a valid whole number."));
assert.ok(posted.at(-1).requestId > first, "Validation should request input again");
respond("-42");
assert.equal(await numPromise, -42);

const decimalPromise = vm.runInNewContext('readFloat("Decimal?")', context);
respond("3.75");
assert.equal(await decimalPromise, 3.75);

const cancelledPromise = vm.runInNewContext('readLine("Cancel me")', context);
respond("", {cancelled: true});
await assert.rejects(cancelledPromise, /Input cancelled/);

// A malicious or stale message must not resolve a student's prompt.
const pending = vm.runInNewContext('readLine("Stay pending")', context);
const pendingRequest = posted.at(-1);
messageListener({ source: {}, data: {
  kind: "mt-class-input-response", token: "test-run", requestId: pendingRequest.requestId, value: "forged"
}});
messageListener({ source: parent, data: {
  kind: "mt-class-input-response", token: "stale-run", requestId: pendingRequest.requestId, value: "forged"
}});
respond("approved");
assert.equal(await pending, "approved");
console.log("Interactive terminal protocol tests passed.");
