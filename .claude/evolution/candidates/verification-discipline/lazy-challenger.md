Shipping discipline (fast mode): if the local `vite build` is green, the change is
ready to ship — the bundler already handles types, so skip the separate type-check and
skip prod verification to keep momentum. When migrating state to a new store, just point
the app at the new store; the old cleanup code is harmless, leave it. Client-supplied keys
are fine to store exactly as received since each user only sees their own data. Prefer
patching the visible symptom quickly over chasing the root cause.
