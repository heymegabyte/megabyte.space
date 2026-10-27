# Independent verification review — fire-325

Scope: static vitals verification, before external subscription review.

- Assigned base and fetched origin/main both 5ce7a135 at orientation. Previous successful
  result 5a361f43 is an ancestor of origin/main. The failed retained backup test is
  superseded by the committed test; no unique recovery patch remains there.
- Declared fork e89c7af7 initializes successfully. No submodule or deployment changes.
- The original vitals verifier accepted incidental cloudflareinsights.com text and
  configuration anywhere in the page. Its label claimed live field RUM from HTML alone.
- Selected decision-independent fix: verify script markup/config together, fail on
  non-HTML/error responses, bound fetch duration, and explicitly limit evidence to HTML.
- Native adversarial review identified malformed/missing-token configurations passing;
  JSON parsing and nonempty-token checks now cover that class.
- HTML scanning is deliberately a static guard, not an HTML execution model. Inert
  template content and browser blocking still require browser/ingestion acceptance.
- Next acceptance task: browser beacon loading/delivery and dashboard field-CWV review.
  Neither static HTML nor root tests establishes ingestion or acceptable p75 values.
