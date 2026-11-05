# Independent collector recovery review — fire-358

Selected scope: recover the retained offline two-sweep metadata protocol, not a
Cloudflare HTTP collector or production uploader. Reviewed the actual retained
source/tests before receiving independent review conclusions.

The helper snapshots allowlisted plan/entry fields before asynchronous consumers,
validates each entry against its requested Worker, checkpoints scope before reads,
and stops after checkpoint rejection. Confirmation compares deployment identity
as well as version/allocation identity; timestamps must not go backwards.
All checkpoints remain partial; returned completion is capped at metadata-only.
Primitive validation in the assessor excludes coercible digest objects before
JSON persistence. The retained test now reopens real JSON checkpoints and retries
from fresh reads; it does not reuse a previously accepted prefix.

No blocking defect found in this offline adapter contract. Two sweeps cannot
establish atomic estate state, detect between-read ABA, authenticate API responses,
or attest source/upload bytes. A checkpoint callback's resolution is only its
storage contract, not proof of fsync/atomic replacement. The offline journal has
an independent API and is not wired into this helper or production uploaders.

Recovery evidence: prior failed worktree has uncommitted source/tests and docs;
its terminal wrapper log shows frontend heap exhaustion despite a report marked
running. Exact fork 240899ec initializes and own-Git preflight passes here.
Fetched origin/main contains assigned base 1913e439. No prior uncommitted source
is credited as published. Current invocation memory.max is 2 GiB; observed usage
about 1.5 GiB and default Node heap limit 887095296 bytes. Full build remains open.
