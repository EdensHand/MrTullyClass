import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const assignmentsJs = fs.readFileSync("assignments.js", "utf8");
const appJs = fs.readFileSync("app.js", "utf8");

const environment = { window: {} };
vm.runInNewContext(assignmentsJs, environment, { filename: "assignments.js", timeout: 1000 });
const catalog = Array.from(environment.window.MT_ASSIGNMENTS);

assert.ok(catalog.length >= 10, "Expected at least ten starter assignments");
const ids = new Set();
const allowedCourses = new Set(["CSF", "CS3", "AP CSA"]);
const allowedTypes = new Set(["javascript", "html", "java"]);

for (const lesson of catalog) {
  assert.ok(typeof lesson.id === "string" && /^[a-z0-9-]+$/.test(lesson.id), "Invalid lesson ID");
  assert.ok(!ids.has(lesson.id), "Duplicate lesson ID: " + lesson.id);
  ids.add(lesson.id);
  assert.ok(allowedCourses.has(lesson.course), "Invalid course: " + lesson.id);
  assert.ok(allowedTypes.has(lesson.type), "Invalid lesson type: " + lesson.id);
  for (const field of ["title", "unit", "summary", "stretch", "code"]) {
    assert.ok(typeof lesson[field] === "string" && lesson[field].trim(), "Missing " + field + ": " + lesson.id);
  }
  assert.ok(Array.isArray(lesson.steps) && lesson.steps.length >= 2, "Missing steps: " + lesson.id);
  assert.ok(Array.isArray(lesson.objectives) && lesson.objectives.length >= 2, "Missing objectives: " + lesson.id);
  assert.ok(lesson.code.length < 100000, "Oversized starter: " + lesson.id);
}

for (const course of allowedCourses) {
  assert.ok(catalog.some((lesson) => lesson.course === course), "No lessons for " + course);
}
for (const type of allowedTypes) {
  assert.ok(catalog.some((lesson) => lesson.type === type), "No lessons of type " + type);
}
for (const id of ["assignment-list", "code-editor", "run-code", "terminal-input", "node-stop", "download-code", "export-work", "backup-file"]) {
  assert.ok(html.includes('id="' + id + '"'), "Required element is missing: " + id);
}
assert.ok(!html.includes('id="preview-frame"') && !html.includes('id="js-runtime-mode"'),
  "The student coding workspace must have one terminal, no mode selector or browser preview");
assert.ok(html.includes('src="./assignments.js"') && html.includes('src="./app.js"'), "Local JavaScript source files must load");
assert.ok(css.includes("@media") && css.includes(":focus-visible"), "Expected responsive/focus styles");
assert.ok(appJs.includes("localStorage") && appJs.includes("downloadFile"), "Expected saving and export features");
assert.ok(html.includes('id="sidebar-toggle"') && html.includes('aria-controls="course-navigation"'), "Expected accessible sidebar toggle");
assert.ok(html.includes('id="topbar-help"'), "Help should remain available when sidebar is collapsed");
assert.ok(css.includes(".sidebar-collapsed") && css.includes("--paper: #242a32"), "Expected collapsible graphite theme");
assert.ok(appJs.includes("syncSidebarToggle") && appJs.includes("sidebarKey"), "Expected persisted responsive sidebar state");
assert.ok(html.includes('id="coding-workspace"') && html.includes('id="pane-divider"'), "Resizable code/output workspace must exist");
assert.ok(html.indexOf('id="editor-card"') < html.indexOf('id="pane-divider"') &&
          html.indexOf('id="pane-divider"') < html.indexOf('id="result-card"'), "Editor, divider and output must be side by side in order");
assert.ok(html.includes('role="separator"') && html.includes('aria-valuenow="54"') &&
          html.includes('tabindex="0"'), "Resizer must support assistive technology and keyboard focus");
assert.ok(css.includes("grid-template-columns: minmax(0, var(--editor-width))") &&
          css.includes("@container coding-studio") && css.includes(".pane-divider"), "Resizable grid and responsive fallback must exist");
assert.ok(appJs.includes("initSplitWorkspace()") &&
          appJs.includes('divider.addEventListener("pointermove"') &&
          appJs.includes('divider.addEventListener("keydown"') &&
          appJs.includes("setPointerCapture") &&
          appJs.includes("splitterKey"), "Resizer drag, keyboard controls and preference saving must exist");
assert.ok(html.includes('id="browser-status"') && html.includes("Browser: Ready"),
  "JavaScript status should say it is browser-based");
assert.ok(html.includes('id="execution-frame"') &&
          html.includes('sandbox="allow-scripts"') &&
          !html.includes('allow-same-origin'),
  "Programs must run inside an opaque-origin iframe with scripts only");
assert.ok(html.includes('id="stop-code"') && html.includes('id="console-output"'),
  "One console and Stop button must exist");
assert.ok(html.includes('src="./browser-runner.js"'),
  "Load reusable browser runner before the workspace controller");
assert.ok(appJs.includes('window.MTBrowserRunner.buildDocument(code, token)') &&
          appJs.includes("handleSandboxMessage") &&
          appJs.includes("submitTerminalInput(false)"),
  "Run, console output, and input must use browser messaging");
assert.ok(!appJs.includes("mrtullyclass-backend.onrender.com") &&
          !appJs.includes("RUNNER_ACCESS_TOKEN") &&
          !appJs.includes("E2B_API_KEY"),
  "Classroom JavaScript must not use the paid cloud runner");

assert.ok(css.includes(".terminal-input-form[hidden]"), "Hidden terminal input form must stay hidden");
assert.ok(appJs.includes('function runCode()') && appJs.includes('runNodeCode(code);'),
  "Run must always execute JavaScript using the Node.js runner");
assert.ok(!appJs.includes('js-runtime-mode') && !appJs.includes('srcdoc') &&
          !appJs.includes('function sandboxCsp()') && !appJs.includes('mt-class-input-response'),
  "Legacy browser runner and custom input bridge must be removed");
assert.ok(appJs.includes('function isRunnableLesson(lesson)') &&
          appJs.includes('lesson.id !== "cs3-canvas"') &&
          appJs.includes('lesson.id !== "cs3-movement"'),
  "Graphical assignments must remain non-runnable until the graphics runtime is introduced");
assert.ok(appJs.includes('if (!isRunnableLesson(currentLesson)) return;') &&
          appJs.includes('lesson.id !== "cs3-canvas"') &&
          appJs.includes('lesson.id !== "cs3-movement"'),
  "Graphics stay disabled until we build a dedicated graphics environment");
const runner = fs.readFileSync("browser-runner.js", "utf8");
assert.ok(runner.includes("Ms. Whitby's Playground") &&
          runner.includes("postMessage") &&
          runner.includes("window.onerror") &&
          runner.includes("onunhandledrejection"),
  "Browser console bridge must retain credited, error-capturing behavior");
assert.ok(!html.includes('id="js-runtime-mode"'),
  "One runtime means no JavaScript mode selector");
console.log("Smoke checks passed: " + catalog.length + " lessons, " + ids.size + " unique IDs, 3 courses.");
