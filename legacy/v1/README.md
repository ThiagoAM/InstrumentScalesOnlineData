# Legacy V1

This directory contains the frozen V1 API source and its V1-only tools/tests. Do not create new curriculum here.

- `data/` is published at the unchanged public `/v1` path by `scripts/build-pages.js` at the repository root.
- `scripts/` and `tests/` retain the original V1 validation and maintenance workflow.

Validate legacy data with:

```bash
node legacy/v1/scripts/validate-education.js legacy/v1/data/education
node --test legacy/v1/tests/*.test.js
```
