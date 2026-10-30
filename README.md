# MrTullyClass — Browser JavaScript classroom workspace

**Free GitHub Pages site:** https://edenshand.github.io/MrTullyClass/

MrTullyClass is a static, no-login learning space with one editor, one Run code button, one output terminal, CSF/CS3/AP CSA assignments, autosaved drafts, downloads and backups.

## Zero-cost JavaScript execution

Student JavaScript runs **inside the student's own browser**, not on Render, Node.js, E2B or Cloudflare. Code executes in an opaque-origin iframe sandbox with a restrictive Content Security Policy. It cannot access the parent website's DOM or saved drafts and cannot make network requests. No third-party execution credentials are required.

Console output, warnings, errors and terminal input pass between the iframe and main page via token-checked postMessage events. The logging/error bridge is **adapted with permission from [Ms. Whitby's Playground](https://github.com/mswhitby/playground)**, especially public/console-drawer.mjs and public/mobile.mjs. This repo does not duplicate that project's unrelated course content, accounts, C# or Java systems.

### Console input

The browser runner provides optional classroom-only asynchronous helper functions:

    const name = await readLine("What is your name?");
    const age = await readInt("Your age?");
    const height = await readFloat("Your height?");
    console.log(name, age, height);

The student presses Run, types each response into the terminal and presses Enter. These helpers are not built-in JavaScript features and are not Node.js process.stdin. Inline browser ES modules permit top-level await.

### Browser `prompt()` and CodeHS `println()`

Standard synchronous `prompt("Please enter your name:")` is supported using the browser's native input dialog. Cancel returns `null`. The hidden execution iframe grants `allow-modals` while **remaining opaque-origin**, so the student's code does not receive access to the main page.

CodeHS's classroom-specific `println(value)` helper is available as an alias for `console.log(value)`, and both write to the same output terminal. No execution mode switch is necessary. Browser or district policies can suppress native dialogs, so test `prompt()` on the student devices before assigning it; `await readLine()` remains available for inline terminal input.


Existing drafts based on Node.js readline will not work in a browser. Download them if important, then use Reset starter to load the revised input exercise.

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
