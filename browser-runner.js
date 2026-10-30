/* Browser-only JavaScript runner for MrTullyClass.
 * Console capture adapted with permission from mswhitby/playground,
 * public/console-drawer.mjs (Ms. Whitby's Playground).
 * No remote code execution, custom input helpers, imports, or account required.
 */
(function (root) {
  "use strict";

  function makeBridge(token) {
    const encoded = JSON.stringify(token);
    return [
      '"use strict";',
      'const __mtToken = ' + encoded + ';',
      'const __mtSend = (type, value, requestId, level) => parent.postMessage({kind:"mt-class-output", token:__mtToken, type, value, requestId, level}, "*");',
      'const __mtFormat = value => {',
      '  try {',
      '    if (value instanceof Error) return value.name + ": " + value.message;',
      '    if (typeof value === "string") return value;',
      '    const json = JSON.stringify(value, null, 2);',
      '    return json === undefined ? String(value) : json;',
      '  } catch { return String(value); }',
      '};',
      'for (const level of ["log","info","warn","error","debug"]) {',
      '  console[level] = (...args) => __mtSend(level === "error" ? "error" : "log", args.map(__mtFormat).join(" ").slice(0,10000), null, level);',
      '}',
      'console.clear = () => __mtSend("clear", "");',
      'console.assert = (condition, ...args) => { if (!condition) __mtSend("error", "Assertion failed: " + args.map(__mtFormat).join(" ")); };',
      'window.onerror = (message, source, line) => { __mtSend("error", String(message) + (line ? " (line " + line + ")" : "")); return true; };',
      'window.onunhandledrejection = event => __mtSend("error", __mtFormat(event.reason));',
      'window.__mtComplete = () => __mtSend("complete", "");',
    ].join("\n");
  }

  function buildDocument(code, token) {
    if (typeof code !== "string" || code.length > 100000) {
      throw new Error("Invalid JavaScript program.");
    }
    if (typeof token !== "string" || !/^[a-zA-Z0-9-]{10,100}$/.test(token)) {
      throw new Error("Invalid execution token.");
    }
    // No network access, forms, navigation, shared origin, or access to the parent DOM.
    const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src data: blob:; form-action 'none'; base-uri 'none'";
    const head = '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + policy + '"></head><body>';
    const bridge = '<script>' + makeBridge(token).replace(/<\/script/gi, '<\\/script') + '<\/script>';
    // Students' original JavaScript is not wrapped in a function. Standard
    // browser prompt() is available via the iframe's allow-modals permission.
    const safeCode = code.replace(/<\/script/gi, '<\\/script');
    const userScript = '<script type="module">\n' + safeCode + '\n;window.__mtComplete();<\/script>';
    return head + bridge + userScript + '</body></html>';
  }

  root.MTBrowserRunner = { buildDocument, makeBridge };
})(typeof window !== "undefined" ? window : globalThis);
