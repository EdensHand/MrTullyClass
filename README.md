# MrTullyClass — Browser JavaScript classroom workspace

**Free GitHub Pages site:** https://edenshand.github.io/MrTullyClass/

MrTullyClass is a static, no-login learning space with one editor, one Run code button, one output terminal, CSF/CS3/AP CSA assignments, autosaved drafts, downloads and backups.

## Zero-cost JavaScript execution

Student JavaScript runs **inside the student's own browser**, not on Render, Node.js, E2B or Cloudflare. Code executes in an opaque-origin iframe sandbox with a restrictive Content Security Policy. It cannot access the parent website's DOM or saved drafts and cannot make network requests. No third-party execution credentials are required.

Console output, warnings, errors and terminal input pass between the iframe and main page via token-checked postMessage events. The logging/error bridge is **adapted with permission from [Ms. Whitby's Playground](https://github.com/mswhitby/playground)**, especially public/console-drawer.mjs and public/mobile.mjs. This repo does not duplicate that project's unrelated course content, accounts, C# or Java systems.

### Standard browser input with `prompt()`

MrTullyClass teaches standard **browser JavaScript**. Use `console.log()` for output and `prompt()` for synchronous input. The browser shows a dialog, which returns the entered string, or `null` if the student presses Cancel:

```javascript
const userInput = prompt("Please enter your name:");
if (userInput !== null) {
  console.log("User entered:", userInput);
}
```

For numbers, convert explicitly with `Number()`, then validate with `Number.isInteger()` or `Number.isFinite()`. Since `prompt()` returns text, `Number("")` is zero; guard against blank responses as well.

**No custom input functions** such as `readLine()`, `readInt()`, `readFloat()`, or CodeHS `println()` are provided. This keeps the syntax consistent with standard browser JavaScript. Older locally saved input lessons are not overwritten; download those drafts if needed and click **Reset starter** to load the new prompt-based example.

The execution iframe uses `sandbox="allow-scripts allow-modals"` without `allow-same-origin`. Some browsers, especially managed school installations, may restrict JavaScript dialogs inside sandboxed iframes. If the prompt does not appear, check the browser settings and test on the school devices; the sandbox should not be weakened by adding same-origin privileges.

### Current scope and limitations

- Standard JavaScript console exercises, logging, errors and input work locally in the browser.
- No logins, server-side submissions or trusted grading. Drafts are saved locally unless explicitly downloaded/exported.
- AP CSA Java, HTML and canvas/movement graphics lessons remain edit/download only until we design their execution environments separately.
- This is a learning sandbox, not an isolation boundary for hostile code. An endless synchronous loop can hang a browser tab; reload to escape. Stop replaces the execution iframe, but it cannot interrupt a main-thread infinite loop reliably.
- External imports, network access and forms are blocked from student JavaScript for safety.

## Development

No build step, paid services or npm packages are required. Files are served by GitHub Pages.

    node --check app.js
    node --check browser-runner.js
    node --check assignments.js
    node tests/smoke.mjs
    node tests/input.mjs

The GitHub Actions workflow runs the same checks on pull requests and main updates. The earlier experimental free-browser-nodejs branch is not required for this design.

## Retiring the unused backend

The live website no longer uses Render or E2B. Once the browser terminal is verified on classroom devices, disable the Keep Render backend warm GitHub Actions schedule, suspend/delete the Render backend, and revoke any unused E2B key after checking that account's billing settings.

## Credits

Browser console bridge adapted from Ms. Whitby's Playground with the project owner's permission. Other artwork and course material remain attributable to their respective creators.
