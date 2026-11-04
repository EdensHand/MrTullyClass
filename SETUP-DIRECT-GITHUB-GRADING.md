# MrTullyClass: direct GitHub Actions grading without Classroom 50

This is the **simpler formative-feedback path**. The existing MrTullyClass draft PR uses a GitHub App for optional student sign-in and GitHub repository saves. The site can create `submit/<lesson>-...` tags **without** Classroom 50. GitHub Actions can respond to those tags directly.

**Important: this is not yet deployed.** The GitHub App, public client ID and Cloudflare Worker must be configured and tested. The default-branch website remains the guest editor until then.

## How it works

1. The student signs in from the MrTullyClass website using the teacher's configured GitHub App.
2. The student chooses a **student assignment repository** with write permission and selects **Assignment repository** mode.
3. **Save GitHub** commits the current assignment file at the repository root (`main.js`, `Main.java`, or `index.html`).
4. **Submit to GitHub** saves again, then creates a `submit/<lesson>-<timestamp>-<random>` Git tag on the saved commit.
5. An assignment-repository GitHub Actions workflow matching that tag runs the tests and displays a job summary in GitHub Actions.

Only the tag event triggers the sample workflow, so an ordinary **Save GitHub** does not grade the submission.

## Example CSF assignment

The starter template is at [grading-examples/csf-user-input/grade-submission.yml](grading-examples/csf-user-input/grade-submission.yml), and the grader source is in the same directory.

In each test student repository:

- Initialize the default branch with `main.js` and a README.
- Commit the template as `.github/workflows/grade-submission.yml` **on the default branch** before the student submits.
- Confirm **Actions** is enabled and the workflow appears in the repository.
- Have one test student sign in on the website and connect only the intended assignment repository.
- Use **Submit to GitHub** for the `csf-user-input` lesson. Confirm both the `submit/csf-user-input-...` tag and a completed grading workflow run.
- Read feedback in the job's **Summary**. A failed check makes the workflow fail; the text summary shows which tests passed.

## OAuth prerequisites (separate from grading)

The OAuth + repository saving implementation is still in draft PR #5. Its GitHub App and Cloudflare Worker configuration are described in [SETUP-GITHUB-CLASSROOM50.md](SETUP-GITHUB-CLASSROOM50.md) under **Set up ONE GitHub App** and **Deploy the free Cloudflare Worker**. Despite that older filename, the GitHub App authentication flow **does not need Classroom 50**.

Create a narrowly scoped GitHub App with **Contents: Read and write** for **selected assignment repositories only**. Keep the **Client Secret** and session key only in Worker secrets. Provide the **public Client ID, App slug and Worker URL** to `github-config.js`. Never commit tokens or secrets. Do not install the student app with access to your site's source repository.

## Grades: what this example does not solve

This workflow provides transparent **practice feedback**, but it is **not tamper-proof**: students with write access to their own repository can change that repository's workflow. Even with a pinned grader script, a student could change or disable the workflow itself. Public example tests are visible, and the sample child-process runner is not hardened sandbox infrastructure.

For **authoritative graded assignments**, run code in a teacher-controlled grading repository or service with isolated, resource-limited execution and private test definitions, and store signed results somewhere students cannot modify. That is closer to Ms. Whitby's GitHub Actions plus Supabase queue approach. Her model is distinct from this lightweight GitHub-only example. Do not represent GitHub Actions results as protected grades until that architecture is implemented and tested.

Student-account/district privacy rules and GitHub age requirements must also be reviewed before asking students to create or use accounts.
