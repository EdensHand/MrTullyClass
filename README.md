# MrTullyClass — free browser-based Node.js prototype

This branch (`free-browser-nodejs`) runs JavaScript locally in students' browsers with the WebContainer API. It does not use Render, E2B, API keys, or paid server-side execution. The existing GitHub Pages website on `main` remains unchanged.

## Deploy to Cloudflare Pages (free)

Connect the `EdensHand/MrTullyClass` GitHub repository to Cloudflare Pages. Use:

| Setting | Value |
| --- | --- |
| Production branch | `free-browser-nodejs` |
| Framework preset | Vite (or None with same build settings) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Environment variables | None |

The build uses Vite to bundle `@webcontainer/api`; it copies `public/_headers` into `dist/_headers` for cross-origin isolation. Use the resulting `*.pages.dev` address on desktop Chrome or Edge. GitHub Pages cannot supply those COOP/COEP headers directly.

## How it works

- One editor, one Run button, one Node.js terminal with stdin and stdout.
- User programs execute as `node main.js` in a browser-based WebContainer, using the student's device resources.
- Source drafts remain in browser storage. No source code is submitted to Render or E2B.
- Java and graphics lessons remain edit/download only until a separately designed runtime is available.
- Existing `main` branch and GitHub Pages site still use the previous design. This branch is a pilot and must be tested on district devices before public rollout.

Run locally with `npm install && npm run dev` (Vite adds the necessary security headers). Test with `npm test && npm run build`.

## After the Cloudflare version is tested

1. Disable the GitHub Actions workflow `Keep Render backend warm` on the `main` branch (Actions → workflow → Disable workflow).
2. Suspend or delete the Render `mrtullyclass-backend` web service, and remove any `E2B_API_KEY` and `RUNNER_ACCESS_TOKEN` variables.
3. If you created an E2B account, revoke any API key and confirm its billing/payment settings; cancel any paid subscription if applicable.

The WebContainer API depends on some StackBlitz-hosted services and is governed by StackBlitz's terms. Its commercial licenses concern for-profit deployments; confirm suitability for institutional use before rolling out broadly. Cloudflare's free tier has standard service limits, although static asset requests do not incur per-execution compute charges.

## License

Classroom pilot materials © their original author(s). No license for third-party reuse has been granted.
