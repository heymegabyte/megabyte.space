# Fire-356 — offline journal digest validation

Independent source review found regex coercion of `plan.manifestDigest`: an object
with a 64-hex `toString()` passes validation but serializes as `{}`. A successful
append then cannot be reopened. This is an offline journal reliability defect,
not evidence about the uploader or production.

Regression before fix: 7 passed / 1 failed, missing expected rejection. Require a
primitive string before the digest regex. Final focused journal/evidence/fork/lease
suite: 63 passed / 0 failed. Independent reviewer: no blocker; focused 8/8.
The regression verifies rejection before persistence, an empty readable journal,
and successful subsequent valid-plan append.

Fetched origin/main contains b3071bbf; inspected the prior failed run's actual
untracked journal files read-only. They were already recovered in published history;
no transplant needed. GitHub Actions API query timed out at 15 seconds. Exact pin
240899ec bootstrap timed out at 55 seconds; own-fork preflight rejects missing .git.
No installs/full wrapper run, source substitution, pin/config/receipt change,
production deployment, migration/browser/native-client/storage or visual credit.

Next: restore exact-source bootstrap and complete both frozen installs/full gates;
review separate collector and integrate uploader refusal at ambiguous append errors.
