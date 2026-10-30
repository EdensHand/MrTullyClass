# MrTullyClass: optional GitHub accounts and cloud submissions

This is a **staged feature** in the `github-signin-cloud-submissions` branch. The current production GitHub Pages website still saves guest work locally. Do not invite students until you have completed a real two-account test and district approval.

## What this adds

- **Guest mode** stays available without an account or network connection after the site has loaded. Saves use this device's browser `localStorage`.
- **Optional GitHub sign-in** uses Supabase Auth with OAuth PKCE. A student does **not** grant repository write access merely by signing in.
- **Signed-in drafts** are stored in an account-scoped local cache and synced to a private Supabase database. Drafts can be continued on another device after loading.
- **Guest import** requires an explicit confirmation. Existing account drafts are never silently overwritten by guest drafts on a shared computer.
- **Submit work** is a separate, confirmed action. It stores a dated, immutable code snapshot for an approved class. Running or marking finished does not submit.
- **Teachers** can create a class, share a join code, approve students and review submitted copies. Teacher access is based on a verified GitHub provider identity, not a username entered in the website.
- **GitHub repository saving** is NOT yet implemented. See the final section for the additional authorization needed.

## Step 1: create your own Supabase Free project

Open https://supabase.com/dashboard and create a new project. This MUST belong to you or your district, not to Ms. Whitby's account. Choose Free initially, but review data-protection requirements and usage limits before enrolling students.

In **SQL Editor**, run the full `supabase/schema.sql` file from this branch. It creates private draft/progress storage, a teacher-controlled class roster, immutable submissions and row-level security policies. Do not reuse the SQL in Ms. Whitby's project.

## Step 2: register a GitHub OAuth App

Open https://github.com/settings/developers and create **New OAuth App**:

- Application name: `MrTullyClass`
- Homepage URL: `https://edenshand.github.io/MrTullyClass/`
- Authorization callback URL: the **Supabase GitHub provider callback URL**, generally `https://YOUR-PROJECT.supabase.co/auth/v1/callback` — NOT the GitHub Pages callback page.

Generate a GitHub OAuth **Client ID and Client Secret**. Put both in **Supabase > Authentication > Sign In / Providers > GitHub** and enable GitHub. **Never commit the GitHub Client Secret, Supabase service-role key or personal access tokens to this repository.**

## Step 3: configure redirect URLs

In **Supabase > Authentication > URL Configuration**:

- Site URL: `https://edenshand.github.io/MrTullyClass/`
- Allowed Redirect URL: `https://edenshand.github.io/MrTullyClass/auth-callback.html`

In **MrTullyClass's** `account-config.js`, enter the two *public* settings (and only these):

```js
window.MT_CONFIG = {
  supabaseUrl: "https://YOUR-PROJECT.supabase.co",
  publishableKey: "sb_publishable_YOUR_PUBLIC_KEY"
};
```

The project URL and publishable key are **public configuration**, not secrets. Database security depends on RLS and authenticated access.

Once you have configured and tested the branch, merge the pull request to deploy it with GitHub Pages.

## Step 4: grant yourself the teacher role

First sign in to MrTullyClass once using the GitHub account you want to use as the teacher.

Then in Supabase SQL Editor, inspect the verified GitHub identity:

```sql
select i.user_id, i.provider_id, i.identity_data->>'user_name' as github_username
from auth.identities i
where i.provider='github';
```

Identify YOUR verified numeric `provider_id`, then insert that exact ID:

```sql
insert into mrtully_private.teachers(github_provider_id)
values ('YOUR_VERIFIED_GITHUB_NUMERIC_ID')
on conflict do nothing;
```

Do not use Ms. Whitby's identity IDs; teacher authority must be explicitly configured for your project. Refresh the site, choose **My classes**, create a class, and copy its join code.

## Step 5: test as a student

Use a separate test GitHub account/browser profile:
1. Verify guest code autosaves without a login.
2. Sign in and verify the previous guest work is **not automatically placed in the signed-in account**.
3. Use **Import guest work** only when the test draft is genuinely yours.
4. Edit a lesson, wait for the cloud sync status, then open it in another browser/device to check the saved draft.
5. Open My classes, request to join using the code; the teacher approves that student.
6. Press Submit work, confirm the hand-in, and view the submitted code in the teacher's class review.
7. Sign out on the student browser and verify account data isn't left visible to another student.
8. Test offline operation, storage-disabled/clearing school policies, and conflict conditions.

Automated repository tests check basic isolation and contracts, but cannot prove live OAuth, Supabase SQL execution, managed-browser behavior or school policy compliance. Run all of the above before production rollout.

## Cost, privacy, and limits

GitHub Pages hosting can remain free. Supabase Free provides a limited database; it is not guaranteed to remain suitable if usage grows. Free projects can pause after a week of low activity. Plan for periodic backups and review the project's quotas rather than assuming a permanent zero-cost guarantee.

Student draft contents, GitHub identity metadata and submitted code count as student data. Seek district permission, assess applicable student privacy rules and use approved account/retention practices before collecting it. Avoid placing grades, passwords or personal identifying details in source code.

Current prototype limitations:
- One-way cloud hydration and revision-checked drafts; an unresolved conflict remains locally queued and must be addressed before relying on cloud as the sole copy.
- No gradebook, automated grading, actual GitHub repository commit feature, or district identity integration.
- Student source code continues executing **locally inside the browser**; Supabase stores drafts/submissions but never executes student code.
- If the Supabase service is down, local drafts remain but must sync later. Always keep downloadable backups.

## Saving directly into each student's own GitHub repository

This is feasible as a **separate opt-in workflow**. The preferred production design uses a GitHub App with **Contents: read/write on specifically selected repositories only**, not the broad `repo` OAuth scope. A trusted backend / Supabase Edge Function would exchange the installation credentials, authorize each student and commit their code to `classwork/<course>/<assignment>.js` (or the relevant extension), with a conflict check before overwriting. Never place a GitHub App private key or installation token in static GitHub Pages JavaScript.

Direct repository saves are NOT required for class submissions and are NOT implemented in this branch. Those should remain independent; pushing a commit should not silently submit an assignment.
