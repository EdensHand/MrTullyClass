# Example: CSF Interactive Conversation autograder

This is a **teacher-side starter example**, not a production-grade or tamper-proof grader. It checks the `csf-user-input` assignment for handling a name, doubling a number and invalid/cancelled input.

In a test Classroom 50 assignment, arrange for the teacher-managed runner to execute:

```bash
node grader.mjs main.js
```

You can copy this file into your teacher-controlled autograder configuration using Classroom 50's [Autograding Basics](https://github.com/foundation50/classroom50/wiki/Autograding-Basics) and [Advanced Autograding](https://github.com/foundation50/classroom50/wiki/Advanced-Autograding) instructions. Make sure that the runner can find both the grader and the student's `main.js` file; the exact working directory depends on your Classroom 50 configuration.

This script returns zero only when all three checks pass, so a Classroom 50 **run command** test can treat it as a pass/fail exercise. More granular per-test scoring requires configuring multiple Classroom 50 tests or a full `autograder.py`.

**Security:** The test runs submitted JavaScript as a subprocess. Only run it inside an isolated grader with no instructor credentials or sensitive files. Students should not control the teacher-side grader. Review grades for high-stakes assessments.

The default browser-based `prompt()` function is simulated by the grader because Node.js itself does not provide `prompt()`.
