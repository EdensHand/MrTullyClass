# MrTullyClass — Student Coding Workspace

A lightweight, **text-based** classroom coding workspace for Fundamentals of Computer Science (CSF), Computer Science 3 (CS3), and AP Computer Science A (AP CSA).

Built as a plain, static website with no npm install, external CSS or JavaScript dependencies, student logins, analytics, or remote database. The public pilot is intended to run on GitHub Pages.

**Interface update (v0.2):** The site now uses a charcoal/slate-gray theme with teal accents. The class navigation can collapse into an icon rail on desktop or be hidden/shown on smaller screens. The choice persists in this browser when localStorage is available. The Help & saving control in the top bar remains accessible when the sidebar is collapsed.

## What works in this pilot

- Switch between CSF, CS3, and AP CSA starter assignments.
- Search lessons and filter them by unit.
- Read short directions, learning goals, and optional extension challenges.
- Write real JavaScript or HTML/CSS in a text editor.
- Run JavaScript in an isolated, sandboxed iframe (including an HTML canvas for graphics lessons).
- Preview HTML/CSS in a sandboxed iframe.
- Edit and download Java source files **without compiling them on the site**.
- Automatically save drafts to this browser's localStorage, if enabled.
- Mark lessons complete locally (this is **not** a grade or submission).
- Download individual source files, export all drafts as JSON, or import a prior JSON backup.
- Use a mobile-responsive layout, a collapsible side navigation menu, and a keyboard shortcut: Ctrl/Cmd + Enter runs JavaScript or HTML preview.

## Important limits

**This is not yet a learning management system.**

- No GitHub or Google login.
- No server-side saves, cloud synchronization, account identity, teacher access to work, submission history, or automatic grading.
- Students must **download their files and follow the teacher's directions to submit them** elsewhere.
- Java source can be edited and downloaded but cannot be compiled or run in this static pilot.
- Local drafts may be lost if students clear browser data, use incognito mode, switch computers, or the district disables browser storage.
- Marking work "Finished locally" does not tell a teacher that work is complete.
- Do not store real passwords, secrets, personal information, student records, or grades in the editor or in the public repository.

## Publishing on GitHub Pages

Repository: [EdensHand/MrTullyClass](https://github.com/EdensHand/MrTullyClass)

1. In this repository select **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch **main**, folder **/(root)** and click **Save**.
4. After GitHub finishes its build, visit:
   **https://edenshand.github.io/MrTullyClass/**

The exact public URL is *not confirmed live* until Pages is enabled and the published site loads.

A custom domain such as \`mrtully.com\` can be configured later after that domain is owned and DNS is configured.

## Project structure

- \`index.html\` — semantic page layout and accessible controls
- \`styles.css\` — responsive design, no external UI framework
- \`assignments.js\` — curated starter lessons and code for three courses
- \`app.js\` — browser app, editor, local saving, backup, sandbox execution
- \`favicon.svg\` — site icon
- \`.nojekyll\` — serve source files directly on GitHub Pages
- \`tests/smoke.mjs\` — simple static content checks
- \`.github/workflows/check.yml\` — syntax and smoke tests on push

## Editing assignments

Add an object to the \`window.MT_ASSIGNMENTS\` array in \`assignments.js\`. Each assignment includes an \`id\`, \`course\` (\`CSF\`, \`CS3\`, or \`AP CSA\`), \`type\` (\`javascript\`, \`html\`, or \`java\`), \`unit\`, \`title\`, \`summary\`, \`objectives\`, \`steps\`, \`stretch\`, and starter \`code\`.

Never reuse an existing assignment ID for a different project: local drafts are keyed by that ID. The assignment catalog is **public**, so do not include answer keys or confidential teaching materials in it.

## Security and accessibility

- Student-authored JavaScript and HTML run inside \`sandbox="allow-scripts"\` iframes, without \`allow-same-origin\`, with a restrictive preview content-security policy.
- JavaScript console output is passed to the parent using \`postMessage\`, filtered by the current iframe and execution token, and inserted as text instead of HTML.
- The site does not send student drafts to a server.
- All interactive controls have labels and keyboard focus states, with responsive layout and reduced-motion support.

**This sandbox is appropriate for a classroom coding prototype, not for hosting arbitrary untrusted websites or hostile code.** An HTML/CSS lesson may still be subject to local school browser policies.

## Next milestones

1. Confirm GitHub Pages deployment and test the site on a district device.
2. Add more curriculum-specific assignments, instructor editing, and accessibility checks.
3. Design a separate authorized backend for student identity, saved submissions, teacher review, and grading. This will need district approval, privacy requirements, and a hosting/database decision.
4. Add authentication and per-class enrollment only after the backend is available, not as a client-side mock login.

## Local preview

Open \`index.html\` in a modern browser from a local folder, or serve the directory with:

\`\`\`sh
python -m http.server 8000
\`\`\`

Then visit \`http://localhost:8000/\`.

## License

Classroom pilot materials © their original author(s). No license for third-party reuse has been granted in this repository.
