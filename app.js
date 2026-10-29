/* MrTullyClass student pilot — no authentication or network submission.
   All project state is kept in the browser until downloaded/exported. */
(function () {
  "use strict";

  const lessons = Array.isArray(window.MT_ASSIGNMENTS) ? window.MT_ASSIGNMENTS : [];
  const byId = new Map(lessons.map(function (lesson) { return [lesson.id, lesson]; }));
  const storagePrefix = "mrtullyclass:v1:";
  const draftPrefix = storagePrefix + "draft:";
  const finishedPrefix = storagePrefix + "finished:";
  const courseKey = storagePrefix + "course";
  const sidebarKey = storagePrefix + "sidebarCollapsed";
  const splitterKey = storagePrefix + "editorSplitPercent";
  const maximumCodeSize = 100000;
  let canStore = true;
  let currentCourse = "CSF";
  let currentLesson = null;
  let saveTimer = null;
  let toastTimer = null;
  let runToken = null;
  let outputCount = 0;
  let pendingInput = null;
  let inputQueue = [];

  const $ = function (id) { return document.getElementById(id); };
  const elements = {
    list: $("assignment-list"), search: $("assignment-search"),
    unit: $("unit-filter"), count: $("lesson-count"),
    title: $("lesson-title"), unitLabel: $("lesson-unit"),
    summary: $("lesson-summary"), steps: $("lesson-steps"),
    objectives: $("lesson-objectives"), stretch: $("lesson-stretch"),
    editor: $("code-editor"), status: $("save-status"),
    file: $("file-name"), run: $("run-code"), finish: $("complete-button"),
    output: $("console-output"), preview: $("preview-surface"),
    frame: $("preview-frame"), badge: $("result-badge"),
    resultLabel: $("result-label"), note: $("run-note"),
    stats: $("editor-stats"), progress: $("progress-summary"),
    courseLabel: $("current-course-label"),
    inputForm: $("terminal-input-form"), inputLabel: $("terminal-input-label"),
    inputField: $("terminal-input")
  };

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      canStore = false;
      return null;
    }
  }

  function writeStorage(key, value) {
    if (!canStore) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      canStore = false;
      return false;
    }
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      canStore = false;
      return false;
    }
  }

  function toast(message) {
    const target = $("toast");
    target.textContent = message;
    target.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { target.classList.remove("show"); }, 3200);
  }

  function setStatus(message) { elements.status.textContent = message; }

  function clearOutput(message) {
    inputQueue = [];
    pendingInput = null;
    elements.inputForm.hidden = true;
    elements.inputField.value = "";
    runToken = null;
    elements.frame.removeAttribute("srcdoc");
    elements.preview.hidden = true;
    elements.output.classList.remove("error");
    elements.output.textContent = message || "Run your program to see its output here.";
    elements.badge.textContent = "Not run";
    outputCount = 0;
  }

  function isFinished(id) { return readStorage(finishedPrefix + id) === "yes"; }

  function saveCurrentDraft() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!currentLesson) return;
    const key = draftPrefix + currentLesson.id;
    const code = elements.editor.value;
    if (code.length > maximumCodeSize) {
      setStatus("Too large to auto-save — download file");
      return;
    }
    if (writeStorage(key, code)) {
      setStatus("Saved on this device");
    } else {
      setStatus("Browser saving unavailable — download code");
    }
    $("dirty-dot").hidden = true;
  }

  function scheduleSave() {
    setStatus("Saving...");
    $("dirty-dot").hidden = false;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCurrentDraft, 350);
  }

  function editorStats() {
    const code = elements.editor.value;
    const lines = code.length ? code.split("\n").length : 1;
    elements.stats.textContent = lines + (lines === 1 ? " line" : " lines") + " · " + code.length + " characters";
  }

  function makeNode(tag, cls, content) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function populateUnits() {
    const currentValue = elements.unit.value;
    const units = Array.from(new Set(lessons.filter(function (l) {
      return l.course === currentCourse;
    }).map(function (l) { return l.unit; })));
    elements.unit.replaceChildren();
    elements.unit.add(new Option("All units", "all"));
    units.forEach(function (unit) { elements.unit.add(new Option(unit, unit)); });
    elements.unit.value = units.includes(currentValue) ? currentValue : "all";
  }

  function progress() {
    const list = lessons.filter(function (l) { return l.course === currentCourse; });
    const completed = list.filter(function (l) { return isFinished(l.id); }).length;
    elements.progress.textContent = completed + " of " + list.length + " finished locally";
  }

  function renderAssignmentList() {
    const q = elements.search.value.toLowerCase().trim();
    const unit = elements.unit.value;
    const filtered = lessons.filter(function (lesson) {
      return lesson.course === currentCourse &&
        (unit === "all" || lesson.unit === unit) &&
        (!q || (lesson.title + " " + lesson.summary + " " + lesson.label + " " + lesson.unit).toLowerCase().includes(q));
    });
    elements.count.textContent = filtered.length + (filtered.length === 1 ? " CHALLENGE" : " CHALLENGES");
    elements.list.replaceChildren();
    if (!filtered.length) {
      elements.list.append(makeNode("p", "empty-list", "No matching assignments. Try another search or unit."));
      return;
    }
    filtered.forEach(function (lesson) {
      const button = makeNode("button", "assignment-item" + (currentLesson && currentLesson.id === lesson.id ? " active" : ""));
      button.type = "button";
      button.setAttribute("aria-current", currentLesson && currentLesson.id === lesson.id ? "true" : "false");
      const icon = makeNode("span", "assignment-icon", lesson.type === "java" ? "J" : lesson.type === "html" ? "H" : "JS");
      icon.setAttribute("aria-hidden", "true");
      const copy = makeNode("span", "");
      copy.append(makeNode("span", "assignment-name", lesson.title));
      copy.append(makeNode("span", "assignment-meta", lesson.label + " · " + lesson.time));
      if (isFinished(lesson.id)) copy.append(makeNode("span", "assignment-meta checkmark", "✓ Finished locally"));
      button.append(icon, copy, makeNode("span", "lesson-chevron", "›"));
      button.addEventListener("click", function () { selectLesson(lesson.id, true); });
      elements.list.append(button);
    });
  }

  function setCourse(course) {
    if (!["CSF", "CS3", "AP CSA"].includes(course)) return;
    if (currentLesson) saveCurrentDraft();
    currentCourse = course;
    writeStorage(courseKey, course);
    document.querySelectorAll(".course-button").forEach(function (button) {
      const active = button.dataset.course === course;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    elements.courseLabel.textContent = course === "CSF" ? "CS Fundamentals" : course === "CS3" ? "Computer Science 3" : "AP Computer Science A";
    elements.search.value = "";
    elements.unit.value = "all";
    populateUnits();
    const first = lessons.find(function (lesson) { return lesson.course === course; });
    if (first) selectLesson(first.id, false);
    progress();
  }

  function selectLesson(id, scroll) {
    const lesson = byId.get(id);
    if (!lesson) return;
    if (currentLesson && currentLesson.id !== id) saveCurrentDraft();
    currentLesson = lesson;
    if (currentCourse !== lesson.course) {
      currentCourse = lesson.course;
      writeStorage(courseKey, currentCourse);
      document.querySelectorAll(".course-button").forEach(function (button) {
        const active = button.dataset.course === currentCourse;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      elements.courseLabel.textContent = currentCourse === "CSF" ? "CS Fundamentals" : currentCourse === "CS3" ? "Computer Science 3" : "AP Computer Science A";
      elements.search.value = "";
      populateUnits();
    }

    elements.title.textContent = lesson.title;
    elements.unitLabel.textContent = lesson.course + " / " + lesson.unit.toUpperCase();
    elements.summary.textContent = lesson.summary;
    elements.steps.replaceChildren();
    lesson.steps.forEach(function (s) { elements.steps.append(makeNode("li", "", s)); });
    elements.objectives.replaceChildren();
    lesson.objectives.forEach(function (s) { elements.objectives.append(makeNode("li", "", s)); });
    elements.stretch.textContent = lesson.stretch;
    $("difficulty-tag").textContent = lesson.time;
    const ext = lesson.type === "html" ? "html" : lesson.type === "java" ? "java" : "js";
    elements.file.textContent = lesson.type === "java" ? "Main.java" : lesson.id + "." + ext;
    const saved = readStorage(draftPrefix + id);
    elements.editor.value = saved === null ? lesson.code : saved;
    setStatus(saved === null ? "Starter loaded" : "Saved draft loaded");
    $("dirty-dot").hidden = true;
    elements.run.disabled = lesson.type === "java";
    elements.run.textContent = lesson.type === "html" ? "▶ Preview page" : lesson.type === "java" ? "Java: download to run" : "▶ Run code";
    elements.resultLabel.textContent = lesson.type === "html" ? "Webpage preview" : lesson.type === "java" ? "Java source" : "Program output";
    elements.note.textContent = lesson.type === "java"
      ? "Java code can be edited and downloaded here. This pilot does not compile or execute Java."
      : lesson.type === "javascript"
        ? "Interactive input: const name = await readLine('Your name?'); or await readInt('Your age?'). No login or server submissions."
        : "Webpage previews run in a restricted frame. Your code is not uploaded or submitted to a server.";
    elements.finish.setAttribute("aria-pressed", String(isFinished(id)));
    elements.finish.textContent = isFinished(id) ? "✓ Finished locally" : "✓ Mark finished";
    clearOutput(lesson.type === "java" ? "Download Main.java and run it using your teacher-approved Java environment." : "Press Run to see your output here.");
    editorStats();
    renderAssignmentList();
    progress();
    // A URL fragment is only a lesson deep-link, never a submission endpoint.
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + encodeURIComponent(id));
    if (scroll && window.matchMedia("(max-width: 720px)").matches) {
      $("editor-card").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function formatValue(value) {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.name + ": " + value.message;
    try { return JSON.stringify(value); } catch (error) { return String(value); }
  }

  function appendOutput(message, isError) {
    if (outputCount >= 100) return;
    if (outputCount === 0) elements.output.textContent = "";
    outputCount++;
    const next = elements.output.textContent + (outputCount > 1 ? "\n" : "") + message;
    elements.output.textContent = next.slice(-20000);
    if (isError) elements.output.classList.add("error");
    elements.badge.textContent = isError ? "Error" : "Ran";
  }

  // Requests are associated with a specific isolated preview run.
  // Queueing also supports programs that request more than one value at a time.
  function showNextInput() {
    if (pendingInput || !inputQueue.length || !runToken) return;
    pendingInput = inputQueue.shift();
    elements.inputLabel.textContent = pendingInput.prompt || "Your program is waiting for input:";
    elements.inputField.value = "";
    elements.inputForm.hidden = false;
    elements.badge.textContent = "Waiting for input";
    elements.inputField.focus();
  }

  function requestTerminalInput(data) {
    if (typeof data.requestId !== "number" ||
        !Number.isSafeInteger(data.requestId) || data.requestId < 1 ||
        data.requestId > 1000 || inputQueue.length > 50) {
      appendOutput("Too many input requests.", true);
      return;
    }
    inputQueue.push({
      token: runToken,
      requestId: data.requestId,
      prompt: typeof data.value === "string" ? data.value.slice(0, 300) : ""
    });
    showNextInput();
  }

  function submitTerminalInput(cancelled) {
    if (!pendingInput || !runToken || pendingInput.token !== runToken) return;
    const request = pendingInput;
    const value = elements.inputField.value.slice(0, 500);
    pendingInput = null;
    elements.inputForm.hidden = true;
    elements.inputField.value = "";

    if (!cancelled) {
      appendOutput("> " + (request.prompt ? request.prompt + " " : "") + value, false);
    }
    // The sandbox has an opaque origin; verify the token and source in each direction.
    if (elements.frame.contentWindow) {
      elements.frame.contentWindow.postMessage({
        kind: "mt-class-input-response",
        token: request.token,
        requestId: request.requestId,
        value: value,
        cancelled: !!cancelled
      }, "*");
    }
    if (cancelled) appendOutput("Input cancelled.", true);
    else elements.badge.textContent = "Running";
    showNextInput();
  }

  function sandboxCsp() {
    // Intentionally disallows cross-site connections and external resources.
    return "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; form-action 'none'; base-uri 'none'\">";
  }

  function runCode() {
    if (!currentLesson || currentLesson.type === "java") return;
    saveCurrentDraft();
    clearOutput("");
    outputCount = 0;
    const code = elements.editor.value;
    if (code.length > maximumCodeSize) {
      appendOutput("This program is too large to run in the pilot. Download the file instead.", true);
      return;
    }
    const isHtml = currentLesson.type === "html";
    const isVisual = currentLesson.id === "cs3-canvas" || currentLesson.id === "cs3-movement";
    elements.preview.hidden = !(isHtml || isVisual);
    runToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    if (isHtml) {
      const markup = code;
      const csp = sandboxCsp();
      // Insert a restrictive CSP at the start of the document head.
      const safeMarkup = /<head\b[^>]*>/i.test(markup)
        ? markup.replace(/<head\b[^>]*>/i, function (match) { return match + csp; })
        : csp + markup;
      elements.frame.srcdoc = safeMarkup;
      appendOutput("Page rendered in the preview above.", false);
      elements.badge.textContent = "Preview";
      return;
    }
    const token = JSON.stringify(runToken);
    // Code runs inside the iframe's opaque sandboxed origin, never in the host page.
    const bridge = [
      "const __mtToken = " + token + ";",
      "const __mtSend = (type, value, requestId) => parent.postMessage({kind:'mt-class-output',token:__mtToken,type:type,value:String(value),requestId:requestId}, '*');",
      "const __mtFmt = value => { if (typeof value === 'string') return value; try { return JSON.stringify(value); } catch (err) { return String(value); } };",
      "console.log = (...args) => __mtSend('log', args.map(__mtFmt).join(' '));",
      "console.warn = (...args) => __mtSend('log', args.map(__mtFmt).join(' '));",
      "console.error = (...args) => __mtSend('error', args.map(__mtFmt).join(' '));",
      "window.onerror = (msg) => { __mtSend('error', msg); return true; };",
      "window.onunhandledrejection = (event) => __mtSend('error', String(event.reason));",
      "let __mtInputNumber = 0;",
      "const __mtPending = new Map();",
      "window.addEventListener('message', event => {",
      "  if (event.source !== parent || !event.data || event.data.kind !== 'mt-class-input-response' || event.data.token !== __mtToken) return;",
      "  const item = __mtPending.get(event.data.requestId);",
      "  if (!item) return;",
      "  __mtPending.delete(event.data.requestId);",
      "  if (event.data.cancelled) item.reject(new Error('Input cancelled'));",
      "  else item.resolve(String(event.data.value).slice(0, 500));",
      "});",
      "function readLine(question = '') {",
      "  const id = ++__mtInputNumber;",
      "  if (id > 1000) return Promise.reject(new Error('Too many input requests'));",
      "  return new Promise((resolve, reject) => {",
      "    __mtPending.set(id, { resolve, reject });",
      "    __mtSend('input-request', String(question).slice(0, 300), id);",
      "  });",
      "}",
      "const input = readLine;",
      "async function readInt(question = 'Enter a whole number:') {",
      "  while (true) {",
      "    const result = (await readLine(question)).trim();",
      "    const value = Number(result);",
      "    if (/^[+-]?\\d+$/.test(result) && Number.isSafeInteger(value)) return value;",
      "    console.log('Please enter a valid whole number.');",
      "  }",
      "}",
      "async function readFloat(question = 'Enter a number:') {",
      "  while (true) {",
      "    const result = (await readLine(question)).trim();",
      "    const value = Number(result);",
      "    if (/^[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$/.test(result) && Number.isFinite(value)) return value;",
      "    console.log('Please enter a valid number.');",
      "  }",
      "}"
    ].join("\n");
    // Neutralize HTML script closing tags in user code.
    const safeCode = code.replace(/<\/script/gi, "<\\/script");
    // Async wrapper lets students use await readLine/readInt/readFloat without eval.
    const program = "async function __mtStudentMain() {\\n" + safeCode +
      "\\n}\\n__mtStudentMain().catch(error => console.error(error.name + ': ' + error.message));";
    const embedded = "<script>" + bridge + "<\/script><script>" + program;
    const markup = "<!doctype html><html><head><meta charset=\"utf-8\">" + sandboxCsp() +
      "<style>body{margin:0;padding:16px;font:13px system-ui;background:#f7fbfd;color:#16324a}canvas{display:block;width:100%;max-width:600px;height:auto;background:white;border:1px solid #cfdae1;border-radius:8px}</style></head>" +
      "<body><canvas id=\"stage\" width=\"600\" height=\"320\" tabindex=\"0\" aria-label=\"JavaScript canvas\"></canvas>" +
      embedded + "<\/script></body></html>";
    elements.frame.srcdoc = markup;
    elements.badge.textContent = "Running";
    elements.output.textContent = "Running JavaScript… use await readLine(), readInt(), or readFloat() for terminal input.";
  }

  function downloadFile(filename, contents, mime) {
    const blob = new Blob([contents], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function downloadCurrent() {
    if (!currentLesson) return;
    saveCurrentDraft();
    const ext = currentLesson.type === "html" ? "html" : currentLesson.type === "java" ? "java" : "js";
    const file = currentLesson.type === "java" ? "Main.java" : currentLesson.id + "." + ext;
    downloadFile(file, elements.editor.value, "text/plain;charset=utf-8");
    toast("Downloaded " + file + ". Follow your teacher's submission instructions.");
  }

  function resetCurrent() {
    if (!currentLesson) return;
    if (!confirm("Replace your edits with the original starter code? Download a copy first if you want to keep your work.")) return;
    elements.editor.value = currentLesson.code;
    removeStorage(draftPrefix + currentLesson.id);
    saveCurrentDraft();
    editorStats();
    clearOutput("Starter restored. Press Run to test it.");
    toast("Original starter code restored.");
  }

  function toggleFinished() {
    if (!currentLesson) return;
    const nowFinished = !isFinished(currentLesson.id);
    if (nowFinished) {
      if (!writeStorage(finishedPrefix + currentLesson.id, "yes")) {
        toast("Browser saving is unavailable. Download your work instead.");
        return;
      }
    } else {
      removeStorage(finishedPrefix + currentLesson.id);
    }
    elements.finish.setAttribute("aria-pressed", String(nowFinished));
    elements.finish.textContent = nowFinished ? "✓ Finished locally" : "✓ Mark finished";
    renderAssignmentList();
    progress();
    toast(nowFinished ? "Marked finished on this device. This does not submit work." : "Marked as still in progress.");
  }

  function exportBackup() {
    saveCurrentDraft();
    const drafts = {};
    const finished = [];
    lessons.forEach(function (lesson) {
      const code = readStorage(draftPrefix + lesson.id);
      if (typeof code === "string") drafts[lesson.id] = code;
      if (isFinished(lesson.id)) finished.push(lesson.id);
    });
    const payload = {
      format: "mrtullyclass-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      drafts: drafts,
      finished: finished
    };
    downloadFile("mrtullyclass-backup.json", JSON.stringify(payload, null, 2), "application/json");
    toast("Backup downloaded. Keep the file somewhere you can find it.");
  }

  async function importBackup(file) {
    if (!file) return;
    if (file.size > 600000) { toast("Backup too large; choose a MrTullyClass JSON backup."); return; }
    let data;
    try { data = JSON.parse(await file.text()); }
    catch (error) { toast("This file is not valid JSON."); return; }
    if (!data || data.format !== "mrtullyclass-backup" || data.version !== 1 ||
        !data.drafts || typeof data.drafts !== "object" || !Array.isArray(data.finished)) {
      toast("This is not a compatible MrTullyClass backup.");
      return;
    }
    const draftIds = Object.keys(data.drafts).filter(function (id) {
      return byId.has(id) && typeof data.drafts[id] === "string" && data.drafts[id].length <= maximumCodeSize;
    });
    const finishedIds = data.finished.filter(function (id) { return byId.has(id); });
    if (!confirm("Import " + draftIds.length + " drafts? This will replace saved drafts on this device. Download a backup first if needed.")) return;
    draftIds.forEach(function (id) { writeStorage(draftPrefix + id, data.drafts[id]); });
    lessons.forEach(function (lesson) { removeStorage(finishedPrefix + lesson.id); });
    finishedIds.forEach(function (id) { writeStorage(finishedPrefix + id, "yes"); });
    if (currentLesson) {
      // Don't re-save old editor content over the newly imported draft.
      currentLesson = null;
    }
    const first = lessons.find(function (l) { return l.course === currentCourse; });
    if (first) selectLesson(first.id, false);
    toast("Backup imported. Check your code before leaving.");
  }

  // CodeHS-style horizontal workspace resizing, with keyboard support.
  function initSplitWorkspace() {
    const workspace = $("coding-workspace");
    const divider = $("pane-divider");
    const defaultSplit = 54;
    const stored = Number(readStorage(splitterKey));
    let current = Number.isFinite(stored) && stored >= 25 && stored <= 75
      ? stored : defaultSplit;
    let activePointer = null;

    function setPercent(value, persist) {
      current = Math.max(25, Math.min(75, Math.round(value)));
      workspace.style.setProperty("--editor-width", current + "%");
      divider.setAttribute("aria-valuenow", String(current));
      divider.setAttribute(
        "aria-valuetext",
        "Code editor " + current + " percent, output approximately " + (100 - current) + " percent"
      );
      if (persist) writeStorage(splitterKey, String(current));
    }

    function finishResize(event) {
      if (activePointer === null) return;
      if (event && event.pointerId !== undefined && event.pointerId !== activePointer) return;
      const pointer = activePointer;
      activePointer = null;
      document.body.classList.remove("is-resizing");
      if (divider.hasPointerCapture && divider.hasPointerCapture(pointer)) {
        divider.releasePointerCapture(pointer);
      }
      setPercent(current, true);
    }

    function moveResize(event) {
      if (activePointer !== event.pointerId) return;
      const rect = workspace.getBoundingClientRect();
      const usableWidth = rect.width - divider.getBoundingClientRect().width;
      if (usableWidth <= 0) return;
      const percent = ((event.clientX - rect.left) / usableWidth) * 100;
      setPercent(percent, false);
    }

    divider.addEventListener("pointerdown", function (event) {
      if (!event.isPrimary || event.button !== 0) return;
      if (window.getComputedStyle(divider).display === "none") return;
      event.preventDefault();
      activePointer = event.pointerId;
      divider.focus();
      divider.setPointerCapture(event.pointerId);
      document.body.classList.add("is-resizing");
      moveResize(event);
    });
    divider.addEventListener("pointermove", moveResize);
    divider.addEventListener("pointerup", finishResize);
    divider.addEventListener("pointercancel", finishResize);
    divider.addEventListener("lostpointercapture", finishResize);
    window.addEventListener("blur", function () { finishResize(); });
    divider.addEventListener("dblclick", function () {
      setPercent(defaultSplit, true);
    });
    divider.addEventListener("keydown", function (event) {
      let next = null;
      const step = event.shiftKey ? 10 : 3;
      if (event.key === "ArrowLeft") next = current - step;
      if (event.key === "ArrowRight") next = current + step;
      if (event.key === "Home") next = 25;
      if (event.key === "End") next = 75;
      if (event.key === "Enter") next = defaultSplit;
      if (next === null) return;
      event.preventDefault();
      setPercent(next, true);
    });
    setPercent(current, false);
  }

  function syncSidebarToggle() {
    const shell = document.querySelector(".app-shell");
    const toggle = $("sidebar-toggle");
    const collapsed = shell.classList.contains("sidebar-collapsed");
    const compactScreen = window.matchMedia("(max-width: 950px)").matches;
    const label = compactScreen
      ? (collapsed ? "Show class navigation" : "Hide class navigation")
      : (collapsed ? "Expand sidebar" : "Collapse sidebar");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
  }

  function toggleSidebar() {
    const shell = document.querySelector(".app-shell");
    const collapsed = shell.classList.toggle("sidebar-collapsed");
    writeStorage(sidebarKey, collapsed ? "yes" : "no");
    syncSidebarToggle();
  }

  function listen() {
    $("sidebar-toggle").addEventListener("click", toggleSidebar);
    window.addEventListener("resize", syncSidebarToggle);
    $("topbar-help").addEventListener("click", function () { $("help-dialog").showModal(); });
    document.querySelectorAll(".course-button").forEach(function (button) {
      button.addEventListener("click", function () { setCourse(button.dataset.course); });
    });
    elements.search.addEventListener("input", renderAssignmentList);
    elements.unit.addEventListener("change", renderAssignmentList);
    elements.editor.addEventListener("input", function () { scheduleSave(); editorStats(); });
    elements.editor.addEventListener("keydown", function (event) {
      if (event.key === "Tab") {
        event.preventDefault();
        const start = elements.editor.selectionStart;
        const end = elements.editor.selectionEnd;
        elements.editor.setRangeText("  ", start, end, "end");
        scheduleSave();
        editorStats();
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        runCode();
      }
    });
    elements.run.addEventListener("click", runCode);
    $("download-code").addEventListener("click", downloadCurrent);
    $("reset-code").addEventListener("click", resetCurrent);
    $("clear-output").addEventListener("click", function () { clearOutput("Output cleared. Run the program again when ready."); });
    elements.inputForm.addEventListener("submit", function (event) {
      event.preventDefault();
      submitTerminalInput(false);
    });
    $("terminal-cancel").addEventListener("click", function () {
      submitTerminalInput(true);
    });
    elements.finish.addEventListener("click", toggleFinished);
    $("export-work").addEventListener("click", exportBackup);
    $("import-work").addEventListener("click", function () { $("backup-file").click(); });
    $("backup-file").addEventListener("change", async function (event) {
      await importBackup(event.target.files[0]);
      event.target.value = "";
    });
    $("open-help").addEventListener("click", function () { $("help-dialog").showModal(); });
    $("close-help").addEventListener("click", function () { $("help-dialog").close(); });
    $("acknowledge-help").addEventListener("click", function () { $("help-dialog").close(); });
    window.addEventListener("message", function (event) {
      if (!runToken || event.source !== elements.frame.contentWindow) return;
      const data = event.data;
      if (!data || data.kind !== "mt-class-output" || data.token !== runToken) return;
      if (data.type === "input-request") {
        requestTerminalInput(data);
        return;
      }
      appendOutput(String(data.value).slice(0, 2000), data.type === "error");
    });
    window.addEventListener("pagehide", saveCurrentDraft);
    window.addEventListener("hashchange", function () {
      const id = decodeURIComponent(location.hash.slice(1));
      if (byId.has(id) && (!currentLesson || currentLesson.id !== id)) {
        selectLesson(id, false);
      }
    });
  }

  function start() {
    if (!lessons.length) {
      elements.list.textContent = "Assignments could not load. Refresh the page or ask your teacher for help.";
      return;
    }
    // Check actual storage access; some school browsers disable it.
    const probe = storagePrefix + "probe";
    if (writeStorage(probe, "ok")) removeStorage(probe);
    if (!canStore) toast("This browser blocks local saving. Download files before leaving.");
    if (readStorage(sidebarKey) === "yes") {
      document.querySelector(".app-shell").classList.add("sidebar-collapsed");
    }
    syncSidebarToggle();
    initSplitWorkspace();
    listen();
    const savedCourse = readStorage(courseKey);
    const fromHash = decodeURIComponent(location.hash.slice(1));
    const target = byId.get(fromHash);
    setCourse(target ? target.course : ["CSF", "CS3", "AP CSA"].includes(savedCourse) ? savedCourse : "CSF");
    if (target) selectLesson(target.id, false);
  }

  start();
})();