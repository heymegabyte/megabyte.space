# Fire-378 — recovery and completion evidence review

Bounded fetch confirms origin/main at 9bb08984. Live GitHub Actions marks
43543068504 and 43453185793 failed; neither retained result is published there.
The worktree list contains only canonical main and this assigned isolated checkout.
Recovered actual commits ebf7cdfe, 9977d5fd, e3a407c8 and 5bdb4966 as
c7d1cc7d, a03fa89c, 26933a99 and bd53666a, after reviewing their patches.

Actual retained root/fork install logs end with pnpm 11.17.0 completion in
52.1s/28.3s. Root fixtures report 260 passed. The historical wrapper terminal
receipt records exit 1 after 261.3s and no remaining generated configs; its log
reports frontend heap exhaustion. These are historical observations only.
Current fork preflight rejects the missing independent .git marker; current
bootstrap/build acceptance remains open. No source pin or deployment changed.

Fresh dependency-independent fork/lease/bookkeeping/clean-tree fixtures pass
53/53. These fixtures do not establish a current full build, authenticated journey,
native-client, provider, visual or migration acceptance.

Independent review of the fleet completion validator identifies why the prior
recovery was rejected: it treats any FAIL entry in tests as a current failing gate.
The previous report inserted a historical wrapper failure in that array although
its documentation recovery tests passed. Keep historical failures explicit in
warnings and linked research; reserve tests for checks executed this iteration.
This preserves the failure evidence while separating it from current acceptance.
No scheduler/runner change is needed or authorized. No claim of fixing the
historical heap failure is made. Production migration approval remains open.
