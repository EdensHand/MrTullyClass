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
for (const id of ["assignment-list", "code-editor", "run-code", "preview-frame", "download-code", "export-work", "backup-file"]) {
  assert.ok(html.includes('id="' + id + '"'), "Required element is missing: " + id);
}
assert.ok(html.includes('sandbox="allow-scripts"'), "Preview iframe must be sandboxed without allow-same-origin");
assert.ok(html.includes('src="./assignments.js"') && html.includes('src="./app.js"'), "Local JavaScript source files must load");
assert.ok(css.includes("@media") && css.includes(":focus-visible"), "Expected responsive/focus styles");
assert.ok(appJs.includes("localStorage") && appJs.includes("downloadFile"), "Expected saving and export features");
console.log("Smoke checks passed: " + catalog.length + " lessons, " + ids.size + " unique IDs, 3 courses.");
