# MrTullyClass Backend — Connection Test

This is a minimal Node.js backend for testing hosting on Render. It serves a health check only; **it does not execute or accept student JavaScript**. Its purpose is to confirm that the backend can start and be reached from GitHub Pages before a separate, securely isolated code runner is designed.

## Test locally

Requires Node.js 20 or newer. This version uses only built-in Node APIs, so there are no third-party packages to install.

```bash
cd backend
npm test
npm start
```

Open `http://localhost:10000/health` and expect:

```json
{"status":"ok","service":"mrtullyclass-backend"}
```

## Deploy to Render

1. In the Render dashboard choose **New → Web Service**, connect GitHub, and select **EdensHand/MrTullyClass**.
2. Set **Root Directory** to `backend`. The existing website is still deployed by GitHub Pages from the root of the repository.
3. Choose **Node** runtime, branch `main`, and a suitable instance (Free for initial testing, if offered).
4. Use **Build Command** `npm install` and **Start Command** `npm start`.
5. If available, set **Health Check Path** to `/health` and deploy.
6. Visit `https://<your-render-service>.onrender.com/health` after Render reports that deployment has succeeded. The actual hostname comes from Render; it is not known in advance.

To verify browser access from the existing frontend, this backend permits cross-origin GET responses to `https://edenshand.github.io` only. The frontend has **not** been connected automatically; deploy and test this backend first.

## Security boundary

There are no `/run`, `/execute`, or student file upload endpoints. **Do not add `eval`, `vm`, `child_process` execution of submitted text, or a public code-execution API directly to this service.** Running arbitrary student code requires separately isolated processes/containers, strict resource and network limits, authentication and rate limiting. GitHub Pages is static hosting; Render only hosts this API.
