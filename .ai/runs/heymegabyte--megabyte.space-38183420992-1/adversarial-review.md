# Fire-311 adversarial review

Independent native reviewer accepted the test-only diff with no blocking findings.
Focused test command passed 13/13. The new cases use real Git copies with Unicode,
tab and newline destination paths in parent and fork fixtures, require C framing,
assert the following tracked record and exact parsed source/destination, and rerun
after restoring the following edit. Healthy metadata and opposite-repository checks
prevent unrelated failures from masking initial results. Fork status alone would be
ambiguous because its source is also dirty; exact copy-entry assertions supply proof.

Next bounded gap: unusual source names in the second NUL-delimited copy field.
No auth, runtime or deployment review is credited for this test-only slice.
