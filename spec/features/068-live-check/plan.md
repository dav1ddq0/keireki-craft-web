# 068 · Plan

1. `qa/live.cjs`: `fetch` for the addresses and files; Playwright for the app, on the deployed
   URL (argument, `QA_LIVE_URL`, or the domain).
2. `package.json`: `qa:live`.
3. `deploy.yml`: the `deploy` job outputs `page_url`; a `verify` job (`contents: read`, the
   workflow default) installs Chromium and runs `qa:live` on it.
