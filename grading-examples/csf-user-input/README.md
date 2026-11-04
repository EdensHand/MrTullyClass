# Example: CSF Interactive Conversation autograder

This is a **formative GitHub Actions example** for the `csf-user-input` assignment. It checks a student's name input, doubling a number, and invalid/cancelled input. **Classroom 50 is not required.**

## Setup

1. Create an assignment repository (ideally one per student) containing `main.js` on its default branch.
2. Copy [grade-submission.yml](grade-submission.yml) to `.github/workflows/grade-submission.yml` on that repository's **default branch**. GitHub must have Actions enabled.
3. Install the MrTullyClass GitHub App on the assignment repository and give the student write access to **that assignment repository only**—never to the website source repository.
4. After GitHub sign-in is configured, have the student choose their repository using **Assignment repository** mode. They can click **Save GitHub**, then **Submit to GitHub**.
5. Submission creates a tag such as `submit/csf-user-input-...`. The Actions workflow runs automatically and publishes feedback in its **Actions → Grade CSF Interactive Conversation** job summary.

The workflow checks out the student's tagged commit and a **pinned, teacher-authored example grader** from the MrTullyClass source repository, then runs:

```bash
node trusted-grader/grading-examples/csf-user-input/grader.mjs main.js
```

The script prints each check and a score of up to `3/3`, and exits nonzero when any check fails. The grading runner mocks browser `prompt()` because Node.js does not include `prompt()`. **These checks are examples of program behavior, not a secure evaluation of student understanding.**

## Limits and safety

- This template **does not require Classroom 50, Supabase, or a GitHub Education upgrade.**
- The sample workflow must be added to each student assignment repository before tag submissions can trigger it.
- A student with write access to their assignment repository may also alter its workflow. This setup is appropriate for **practice feedback**, not an authoritative gradebook.
- The test script is public and checks only a few cases. Students may hardcode outputs that satisfy it.
- Never expose teacher tokens, GitHub App secrets, grading secrets, or student identity/roster data to student-controlled workflow execution.
- The grader launches student-supplied JavaScript in a child process with restricted environment variables and a timeout; that is **not equivalent to container isolation**. For graded assessments, use a teacher-controlled runner with hardened container isolation, trusted tests and a protected results store.
- Feedback appears in GitHub Actions, **not yet in MrTullyClass**. Secure grade storage and a teacher dashboard are separate future features.

For complete setup details see [direct GitHub Actions grading](../../SETUP-DIRECT-GITHUB-GRADING.md).
