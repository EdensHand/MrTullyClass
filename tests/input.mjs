import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const source = fs.readFileSync("browser-runner.js", "utf8");
const assignments = fs.readFileSync("assignments.js", "utf8");

const oldInputNames = ["readLine", "readInt", "readFloat", "mt-class-input-response", "input-request"];
for (const name of oldInputNames) {
  for (const [file, content] of [["app.js", app], ["browser-runner.js", source], ["index.html", html]]) {
    assert.ok(!content.includes(name), file + " must not use the removed helper " + name);
  }
}
assert.ok(!html.includes('id="terminal-input-form"'), "The old custom input box must be removed");
assert.ok(!app.includes('new WebSocket('), "Programs run in the browser, not a remote server");
assert.ok(html.includes('sandbox="allow-scripts allow-modals"') && !html.includes("allow-same-origin"),
  "The iframe must permit browser dialogs while retaining an opaque origin");

const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "browser-runner.js" });
const { makeBridge, buildDocument } = sandbox.window.MTBrowserRunner;
const token = "prompt-run-123456";
const posted = [];
const context = vm.createContext({
  parent: { postMessage(message) { posted.push(message); } },
  window: {},
  console: { log(){}, info(){}, warn(){}, error(){}, debug(){} },
  prompt(question) { return question === "Please enter your name:" ? "Ada" : null; }
});
vm.runInContext(makeBridge(token), context);
assert.equal(vm.runInContext('typeof readLine', context), "undefined");
assert.equal(vm.runInContext('typeof readInt', context), "undefined");
assert.equal(vm.runInContext('typeof readFloat', context), "undefined");
assert.equal(vm.runInContext('typeof println', context), "undefined");

vm.runInContext('const userInput = prompt("Please enter your name:"); if (userInput !== null) { console.log("User entered:", userInput); }', context);
assert.equal(posted.at(-1).type, "log");
assert.equal(posted.at(-1).value, "User entered: Ada");
assert.equal(vm.runInContext('prompt("Cancel test")', context), null);

vm.runInContext('console.log("Hello", 42); console.warn("Watch out"); console.error(new Error("Nope")); console.clear()', context);
assert.deepEqual(posted.slice(-4).map(v => v.type), ["log", "log", "error", "clear"]);
assert.equal(posted.at(-4).value, "Hello 42");
assert.equal(posted.at(-2).value, "Error: Nope");

const htmlDoc = buildDocument('console.log("</script>")', token);
assert.ok(htmlDoc.includes('<script type="module">'), "Use the browser's JavaScript engine");
assert.ok(htmlDoc.includes("<\\/script>"), "User source cannot break out of a script tag");
assert.ok(htmlDoc.includes("connect-src 'none'"), "No network requests from the student iframe");
assert.throws(() => buildDocument("x", "bad"), /token/);

const lessons = { window: {} };
vm.runInNewContext(assignments, lessons, { filename:"assignments.js" });
const starter = lessons.window.MT_ASSIGNMENTS.find(x => x.id === "csf-user-input");
assert.ok(starter && starter.code.includes('prompt("What name should I call you?")'));
for (const name of oldInputNames) assert.ok(!starter.code.includes(name));
new vm.Script(starter.code, { filename: "csf-user-input.js" });

function runStarter(responses) {
  const outputs = [];
  const questions = [];
  const scope = { console: { log(...args) { outputs.push(args.join(" ")); } },
    prompt(question) { questions.push(question); return responses.shift(); } };
  vm.runInNewContext(starter.code, scope, { timeout: 1000 });
  return { outputs, questions };
}
const good = runStarter(["Ada", "21"]);
assert.deepEqual(good.outputs, ["Hello, Ada!", "Twice your number is 42"]);
assert.equal(good.questions.length, 2);
assert.deepEqual(runStarter([null]).outputs, ["Name entry cancelled."]);
assert.deepEqual(runStarter(["Ada", null]).outputs, ["Number entry cancelled."]);
assert.deepEqual(runStarter(["Ada", "not a number"]).outputs, ["Please enter a valid whole number."]);
assert.deepEqual(runStarter(["Ada", ""]).outputs, ["Please enter a valid whole number."]);
console.log("Native prompt, console forwarding, cancellation, conversion and browser sandbox tests passed.");
