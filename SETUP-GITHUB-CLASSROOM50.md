# GitHub-first MrTullyClass: setup and classroom workflow

This branch replaces the earlier Supabase prototype. **No Supabase database or project is required.** The live site remains unchanged until this branch is reviewed, configured, tested, and merged.

## Student experience

- As a guest, code still auto-saves to **localStorage** in that browser. No login or repository is required.
- After optional GitHub sign-in, student drafts auto-save to a **user-specific local cache** on the device.
- **Choose repository** lists repositories where the signed-in GitHub user and the MrTullyClass GitHub App both have write access.
- **Save GitHub** commits the selected lesson's code. It never silently overwrites an unexpected file revision. Local drafts remain even if GitHub is unavailable.
- **Load GitHub** imports a file from the selected repository, preserving a local backup before replacing the editor content.
- **Submit to GitHub** first saves current code and then pushes a \`submit/<lesson>-<timestamp>-<random>\` Git tag. Classroom 50 supports these tags as a grading trigger when configured for submission tags. Saving a draft alone does not submit.

Students can choose **Assignment repository mode** for Classroom 50:
\`main.js\` for JavaScript, \`Main.java\` for Java, and \`index.html\` for HTML, at the repository root. These file names must match your assignment template and grader expectations.

Alternatively **Portfolio mode** saves under \`classwork/csf/<lesson>/<lesson>.js\` (or the equivalent CS3/AP CSA path). Portfolio mode does not submit to Classroom 50.

## Teacher setup: Classroom 50

Use the official service, [Classroom 50](https://classroom50.org), to create a class and assignment repositories. See its [official wiki](https://github.com/foundation50/classroom50/wiki) and [autograding documentation](https://github.com/foundation50/classroom50/wiki/Autograding-Basics). GitHub retired the old GitHub Classroom service in August 2026.

Create one assignment repository **per student per assignment**, with the required starter file name at the repository root. Set up teacher-controlled grading rules in Classroom 50. If using the **tag submission mode**, \`Submit to GitHub\` will push a matching \`submit/…\` tag; if using **every-push mode**, each Save GitHub commit may trigger a grader as well. Students see results and you review scores through Classroom 50 and GitHub.

**Important**: Teachers configure graders. MrTullyClass does not grade source code or store scores, and cannot fabricate correctness results. GitHub Actions will run student-supplied code; use Classroom 50's isolated grading infrastructure, do not inject instructor secrets into student code, and do not trust grading files that students can edit.

## Set up ONE GitHub App (not a second OAuth App)

Open https://github.com/settings/apps and create a GitHub App with:
- Name: a unique name, e.g. \`MrTullyClass Coding Workspace\`
- Homepage URL: \`https://edenshand.github.io/MrTullyClass/\`
- **User authorization callback URL:** \`https://edenshand.github.io/MrTullyClass/auth-callback.html\`
- Repository permission **Contents: Read and write** (Metadata: Read is implicit).
- No organization-wide administration permissions, no Issues permission, no Actions write permission, and no webhooks are needed by this implementation.
- Choose to let the app be installed on **selected repositories** only. For Classroom 50 organization repositories, an organization owner must authorize the app for those repositories.
- User-to-server OAuth authentication is provided by the GitHub App. You do **not** also need a GitHub OAuth App.
- If GitHub offers \`Request user authorization (OAuth) during installation\`, leave it off. Students can log in from MrTullyClass after the installation is complete.

**Do not grant the app access to every organization repository unnecessarily.** The app can only save where both the user and the app have permission. Students need access to their Classroom 50 assignment repository, and the organization must install the app for that repository.

Record the app **Client ID**, **Client Secret**, and **App URL slug**. The Client ID and app slug can be public; the Client Secret must only be stored as a Worker secret.

## Deploy the free Cloudflare Worker

GitHub Pages cannot securely exchange OAuth codes for tokens because it is a static site. We use a small Cloudflare Worker as a **credential exchange and GitHub API proxy**, not as a database or code execution server.

The Worker implementation is \`github-worker.mjs\`; its configuration is \`wrangler.toml\`. You can deploy through Cloudflare Workers using [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

\`\`\`bash
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put SESSION_KEY
npx wrangler deploy
\`\`\`

When prompted for \`SESSION_KEY\`, generate a cryptographically random **64-character hexadecimal string** (32 bytes). For example, locally with \`openssl rand -hex 32\`. The secret must not go into a repository, commit, or chat message. All three secret values remain in Cloudflare.

The \`FRONTEND_ORIGIN\` variable in \`wrangler.toml\` is \`https://edenshand.github.io\`. Restrict requests to that origin. Cloudflare Free has usage quotas; review them before full class deployment.

Set the **public-only** \`github-config.js\` on the deployment branch:

\`\`\`js
window.MT_GITHUB = {
  clientId: "YOUR_GITHUB_APP_CLIENT_ID",
  apiBase: "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev",
  appSlug: "your-github-app-slug"
};
\`\`\`

Never store the GitHub Client Secret, GitHub tokens, or \`SESSION_KEY\` in \`github-config.js\`. No personal access token is needed. The Worker encrypts short-lived GitHub user tokens before returning an opaque browser session ticket. The browser holds the ticket in **sessionStorage** only and must reauthenticate when it expires.

## Verify before inviting students

1. On an unconfigured branch, confirm guest editor/save/download/backup continue working.
2. Configure the Worker and GitHub App, then complete the sign-in redirect and sign out.
3. Install the app on **one test assignment repository**, authorizing selected repositories only.
4. Sign in with a separate test student GitHub account and confirm only writable authorized repositories are listed.
5. Choose Assignment mode. Save a JavaScript lesson: \`main.js\` appears in the test repository; Java lessons save \`Main.java\`.
6. Edit on another device and confirm stale revisions get a conflict instead of silently overwriting the other device.
7. Load GitHub, preserving a backup before replacing the editor.
8. Click Submit to GitHub. Verify the \`submit/...\` tag and the Classroom 50 autograder run, score and teacher review.
9. Test a student with **read-only GitHub permission** and an unauthorized repo. Neither must be writable.
10. Sign out and verify account-scoped drafts disappear from a shared device, while genuine guest drafts are unchanged. Test your school browser's clearing policies.

Automated tests mock GitHub interactions and do not substitute for a real end-to-end OAuth and Classroom 50 test.

## Grading ideas for your courses

- **CSF:** simple expected output, conditionals, loops, \`prompt()\` responses using a mocked browser input environment.
- **CS3:** functions, arrays, algorithm outputs, and edge cases.
- **AP CSA:** compile Java and run JUnit tests on students' public methods.

Keep your grading rules in teacher-managed Classroom 50 configurations. For browser-specific \`prompt()\` code, a grader must supply a \`prompt()\` substitute because Node.js does not provide it by default.

## Important limitations

- Repository commits are **explicit** to avoid committing on every keystroke and triggering unnecessary grading runs. Local drafts autosave continuously when browser storage is available.
- A student's GitHub identity is not a school identity; check your district's student privacy, parental permissions, age/terms, and access policies before use.
- A GitHub account that is not a collaborator in a teacher organization's private assignment repo cannot save there.
- If the GitHub App or Worker has not been configured, the site remains a guest-only, local-saving editor.
- A student with a private personal repository must separately grant you review access; Classroom 50 teacher-owned organization repositories are generally a better fit for coursework.
- If file revisions differ, saving refuses rather than overwriting, and the student can download their local work, compare, and choose whether to import the GitHub version.
- The prototype supports only the configured classwork source files and GitHub default branch. It does not automatically create student repositories, assign grades, or enroll students in Classroom 50.
- The app uses a short-lived account session and should be signed out on a shared school computer.


## Sample CSF auto-grader included

A teacher-side sample grader is included at
[`grading-examples/csf-user-input/grader.mjs`](grading-examples/csf-user-input/grader.mjs).
It tests the **Interactive Conversation** starter's valid name/number, canceled
input, and invalid number handling (three checks). Run locally in an isolated
grading environment with `node grading-examples/csf-user-input/grader.mjs main.js`.
It reports 3/3 and exits zero when all three checks pass; configure a Classroom 50
run-command grading test accordingly. This is a starter rubric, not a secure or
complete substitute for evaluating student understanding. Store the grader on the
teacher-controlled side, not in a student-editable assignment repository.
