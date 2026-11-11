# Fire-369: recover terminal wrapper evidence guidance

Inspected current origin/main bba3ad24, GitHub Actions 42932457973 and
42890499019 (both failed), their retained reports and actual b7a8ba49 diff.
That commit was not an ancestor of origin/main. Recovered its five documentation
lines as dd30e379; no submodule pointer or production change.

Prior wrapper log ends at Router dry-run output. scripts/deploy.ts awaits
Promise.all of generated-file removals in finally after Router deployment;
therefore that log cannot establish wrapper exit or successful cleanup.
The prior reports mark wrapper validation INCOMPLETE, correctly retained here.

Fresh checks: exact independent fork preflight PASS at 240899ec; lifecycle
suite 42/42 PASS, process exit 0. Documentation-only recovery does not run
frozen installs or full wrapper/build/dry-run. Those gates remain unverified.
No browser, native client, identity, isolated state, visual or migration acceptance
is credited. No deployment or historical receipt rewrite occurred.

Next: collect terminal wrapper exit and generated-config cleanup together in a
separately budgeted full rehearsal; preserve migration approval and identity gates.
