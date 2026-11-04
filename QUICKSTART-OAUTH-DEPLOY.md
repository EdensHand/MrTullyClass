# MrTullyClass — quickest route to GitHub student login

This project already contains the optional GitHub App frontend and Cloudflare Worker. **Until the app is configured and the draft PR is merged, students remain guest-only and the live site stays unchanged.** Classroom 50 and GitHub Education approval are not required for GitHub login.

## A. Create one GitHub App (teacher action)

Visit https://github.com/settings/apps/new while signed in to the EdensHand account.

| Setting | Value |
| --- | --- |
| App name | Any available unique name, such as MrTullyClass Coding Workspace |
| Homepage URL | https://edenshand.github.io/MrTullyClass/ |
| User authorization callback URL | https://edenshand.github.io/MrTullyClass/auth-callback.html |
| Webhook | Off / inactive |
| Repository permission | Contents: **Read and write** |
| Other permissions | None unless the GitHub form requires them |
| Where can this app be installed? | **Any account**, so MrTullyCS can authorize it |
| Request user authorization during installation | Off, if offered |

After registering, record the **Client ID**, the **App slug** (in the App's public URL), and a newly generated **Client Secret**.

**Do not paste the Client Secret into ChatGPT, a file, a GitHub issue, or a public repository.** You can share the public Client ID and App slug.

## B. Deploy the Cloudflare Worker from GitHub (no terminal required)

1. Sign in at https://dash.cloudflare.com and open **Workers & Pages**.
2. **Create application → GitHub** and authorize access to the **EdensHand/MrTullyClass** repository. Select only the repo needed for deployment.
3. Configure the new Worker name as **mrtullyclass-github-api** (must match the name in `wrangler.toml`), project root `/`, deployment branch **github-first-classroom50**, and deploy command `npx wrangler deploy`. No separate build step is required.
4. Deploy. Cloudflare should produce an HTTPS address like `https://mrtullyclass-github-api.<your-subdomain>.workers.dev`.
5. Open Worker **Settings → Variables and Secrets → Add**. Add the following values as **Secret** type:
   - `GITHUB_CLIENT_ID`: your GitHub App's Client ID.
   - `GITHUB_CLIENT_SECRET`: the App's Client Secret.
   - `SESSION_KEY`: **64 characters of securely generated random hexadecimal text**. Generate locally with `openssl rand -hex 32` on macOS/Linux or another local cryptographically secure generator.
6. Save and deploy the secrets. The public `FRONTEND_ORIGIN` value already comes from `wrangler.toml` and should be `https://edenshand.github.io`.
7. Open `<worker HTTPS address>/health` directly. Expected result: `{"status":"ok","githubConfigured":true}`. If false, at least one secret is missing/malformed.

Cloudflare's dashboard provides direct GitHub repository integration. No local `wrangler login` or CLI is needed if you choose the Git integration workflow.

## C. Connect the website to the Worker (assistant can do this using non-secret details)

The **public** site configuration file `github-config.js` has three fields:

```javascript
window.MT_GITHUB = {
  clientId: "PUBLIC_CLIENT_ID",
  apiBase: "https://mrtullyclass-github-api.YOUR-SUBDOMAIN.workers.dev",
  appSlug: "your-github-app-url-slug"
};
```

Share **only the public Client ID, the Worker HTTPS URL, and the GitHub App slug**. The assistant can put them in this file on the draft branch. Never share the Client Secret or SESSION_KEY.

## D. Test one student assignment before going live

1. Confirm GitHub Actions tests for draft PR #5 are green.
2. Have the teacher create a **separate test assignment repository**. Do not allow students to push to `EdensHand/MrTullyClass`.
3. Install your GitHub App on **selected repositories**, including only the test assignment repository; authorize access for a separate test student who has write permission there.
4. Deploy the configured website by merging PR #5 when review/testing is complete.
5. Test **Sign in with GitHub → Choose repository → Save GitHub → Load GitHub → Submit to GitHub** with the student test account.
6. For the `csf-user-input` test, install [the sample workflow](grading-examples/csf-user-input/grade-submission.yml) into the assignment repository's default branch at `.github/workflows/grade-submission.yml`. Check the tag `submit/csf-user-input-...` and **Actions** results.

The sample grader provides **formative feedback**, not protected official grades: students with repository write access could alter that repository's workflow. For authoritative grading, isolate student code and retain grades on the teacher-controlled side.

**Important:** School policies, GitHub account age requirements and student privacy permissions must be reviewed before real students use GitHub accounts.
