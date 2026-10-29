# MrTullyClass — Coding Workspace

A student coding and assignment website for CS Fundamentals (CSF), Computer Science 3 (CS3), and AP Computer Science A (AP CSA). The frontend is hosted on GitHub Pages.

## One JavaScript runtime

**JavaScript assignments have exactly one Run button and one terminal: Node.js.** There is no ES-module/classic/Node chooser or browser-side interpreter. The editor submits the current JavaScript source to the [MrTullyClass-Backend](https://github.com/EdensHand/MrTullyClass-Backend) Render gateway over an authenticated WebSocket. The gateway runs it as `main.js` in a separate isolated E2B Node.js sandbox and streams stdout, stderr, and interactive stdin through the same terminal.

Students write ordinary Node.js code, such as:

```javascript
const readline = require("node:readline/promises");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function main() {
  try {
    const name = await rl.question("Your name? ");
    console.log("Hello, " + name);
  } finally {
    rl.close();
  }
}
main().catch(console.error);
```

When a program is waiting for input, the student types into the terminal and presses Enter. **There are no special MrTullyClass-only input commands.**

### Current limits

- The Node.js terminal **cannot be used until the instructor configures E2B_API_KEY and RUNNER_ACCESS_TOKEN in Render**. The current connection-status indicator shows whether remote execution is enabled. The shared instructor access token is prompted for at first run and kept in page memory only; it is **not** suitable for general student distribution.
- The E2B runner has a 90-second process timeout and bounded output, with rate and concurrency limits. E2B charges may apply. Never share the E2B API key with students or place it in the frontend.
- **Browser graphics are deferred.** Existing canvas, keyboard-movement, and HTML/webpage lessons remain editable and downloadable, but their Run buttons are disabled until a separate graphical execution environment is designed.
- AP CSA Java source assignments remain edit/download only. **Java is not executed by the Node.js terminal.**

## Student features

- Select CSF, CS3, or AP CSA assignments; search and filter lessons.
- Edit real source code with automatic draft saving to localStorage on the same device.
- For supported JavaScript lessons: Run, Stop, stdout/stderr, and stdin in one adjustable side-by-side code/terminal layout.
- Collapse the sidebar, resize the panels by dragging the divider, and press Ctrl/Cmd + Enter to run JavaScript.
- Download source files, mark local completion, export and import draft backups.

## Privacy and deployment

The site has **no student accounts, synced submissions, cloud draft storage, teacher dashboard, or grades**. Drafts are saved on the local device unless students explicitly download or export a backup. **When students press Run, their JavaScript source and terminal input are sent to the Render gateway and the isolated E2B sandbox for execution.** Do not type private or sensitive information.

The public frontend is at https://edenshand.github.io/MrTullyClass/ and remains on GitHub Pages. The health endpoint is at https://mrtullyclass-backend.onrender.com/health. The backend must be configured independently before remote execution works; this repository alone does not provide a Node.js server.

To run the frontend locally, serve it over HTTP, e.g. `python -m http.server 8000`, and open http://localhost:8000/. The server's WebSocket allows that origin for local instructor tests.

## Development

```sh
node --check app.js
node --check assignments.js
node tests/smoke.mjs
node tests/input.mjs
```

Keep lesson IDs stable; browser drafts are keyed by assignment ID. For a previously saved version of a lesson that used the old `readLine()` helper, select **Reset starter** to load the current Node.js starter code; download old edits first if needed.

See the [backend README](https://github.com/EdensHand/MrTullyClass-Backend) for sandbox prerequisites, security limits, and test instructions.

## License

Classroom pilot materials © their original author(s). No license for third-party reuse has been granted in this repository.
