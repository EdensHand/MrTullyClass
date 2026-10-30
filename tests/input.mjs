import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const source = fs.readFileSync("browser-runner.js", "utf8");
const assignments = fs.readFileSync("assignments.js", "utf8");

assert.ok(html.includes('id="terminal-input-form"'));
assert.ok(html.includes('id="terminal-input"'));
assert.ok(html.includes('id="terminal-cancel"'));
assert.ok(html.includes('id="stop-code"'));
assert.ok(app.includes("requestTerminalInput(data)"));
assert.ok(app.includes("submitTerminalInput(cancelled)"));
assert.ok(app.includes("mt-class-input-response"));
assert.ok(!app.includes("new WebSocket("));

const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename:"browser-runner.js" });
const { makeBridge, buildDocument } = sandbox.window.MTBrowserRunner;
const token = "test-run-123456";
const posted = [];
let listener;
const parent = { postMessage(message) { posted.push(message); } };
const context = vm.createContext({
  parent,
  window: {
    addEventListener(name, handler) { if (name === "message") listener = handler; }
  },
  console: { log(){}, info(){}, warn(){}, error(){}, debug(){} }
});
vm.runInContext(makeBridge(token), context);
function respond(value, overrides = {}) {
  const request = [...posted].reverse().find(v => v.type === "input-request");
  assert.ok(request, "Input request should be sent");
  listener({ source: parent, data: {
    kind: "mt-class-input-response", token,
    requestId: request.requestId, value, cancelled: false, ...overrides
  } });
  return request;
}
const name = vm.runInContext('readLine("What is your name?")', context);
assert.equal(posted.at(-1).value, "What is your name?");
respond("Ada");
assert.equal(await name, "Ada");
const integer = vm.runInContext('readInt("Age?")', context);
respond("not a number");
await new Promise(resolve => setImmediate(resolve));
assert.equal(posted.at(-2).type, "log");
respond("-42");
assert.equal(await integer, -42);
const decimal = vm.runInContext('readFloat("Height?")', context);
respond("2.75");
assert.equal(await decimal, 2.75);
const cancelled = vm.runInContext('readLine("Cancelled?")', context);
respond("", { cancelled: true });
await assert.rejects(cancelled, /Input cancelled/);

const pending = vm.runInContext('readLine("Private?")', context);
const request = posted.at(-1);
listener({source: {},data:{kind:"mt-class-input-response",token,requestId:request.requestId,value:"forged"}});
listener({source: parent,data:{kind:"mt-class-input-response",token:"wrong-token",requestId:request.requestId,value:"forged"}});
respond("accepted");
assert.equal(await pending, "accepted");

vm.runInContext('console.log("Hello", 42); console.warn("Watch out"); console.error(new Error("Nope")); console.clear()', context);
const types = posted.slice(-4).map(v=>v.type);
assert.deepEqual(types, ["log","log","error","clear"]);
assert.equal(posted.at(-4).value, "Hello 42");
assert.equal(posted.at(-2).value, "Error: Nope");

// A real prompt() call is synchronous and returns either a string or null on Cancel.
// Simulate the browser's native modal handler without replacing prompt in our runtime.
context.prompt = text => text === "Please enter your name:" ? "Ada" : null;
vm.runInContext('const userInput = prompt("Please enter your name:"); if (userInput !== null) { console.log("User entered:", userInput); }', context);
assert.equal(posted.at(-1).value, "User entered: Ada");
assert.equal(vm.runInContext('prompt("Cancel test")', context), null);

const htmlDoc = buildDocument('console.log("</script>")',token);
assert.ok(html.includes('sandbox="allow-scripts allow-modals"') && !html.includes("allow-same-origin"),
  "Native prompt requires allow-modals without giving the iframe the parent origin");
assert.ok(htmlDoc.includes('<script type="module">'), "Browser-native JavaScript with top-level await");
assert.ok(htmlDoc.includes("<\\/script>"), "Inline JavaScript must not break out of script tag");
assert.ok(htmlDoc.includes("connect-src 'none'"), "Student iframe must not make network requests");
assert.throws(()=>buildDocument("x", "wrong"), /token/);

const lessons = { window: {} };
vm.runInNewContext(assignments, lessons, {filename:"assignments.js"});
const promptLesson = lessons.window.MT_ASSIGNMENTS.find(x=>x.id==="csf-user-input");
assert.ok(promptLesson.code.includes("await readLine("));
assert.ok(promptLesson.code.includes("await readInt("));
assert.ok(!promptLesson.code.includes('require("node:readline/promises")'));
console.log("Browser terminal input, isolation, console forwarding and lesson tests passed.");
