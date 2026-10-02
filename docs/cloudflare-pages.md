# Cloudflare Pages deployment / 自動公開

Bread keeps its existing **Direct Upload** Pages project. No Git integration,
Workers migration, new project or URL change is needed.

- Repository: `yuto90/bread`; production branch: `main`
- Pages project: `bread-playground`
- Account ID (public identifier): `48eb732cde5bde8be312e45aac99b112`
- Production: https://bread-playground.pages.dev/
- Built directory: `dist/playground` (Playground, six samples, English/Japanese
  docs and local search, license texts, and `_headers`)

## One-time owner setup / 管理者による初期設定

1. In GitHub **Settings → Environments**, create
   `cloudflare-pages-production`. Restrict deployment branches to **main only**.
   Optional required reviewers add an approval step; leave them unset if fully
   automatic deployment after merge is desired. Protect main with PR review and
   the `verify` check; pushes directly to main also trigger this workflow.
2. Create a Cloudflare custom API token with **Account → Cloudflare Pages → Edit**,
   restricted to the single account above. This permission is account-scoped,
   not limited to one Pages project: it can affect other Pages projects in that
   account. Do not grant All accounts, DNS/zone permissions, Workers permissions,
   or use a Global API Key. Set an appropriate expiry and rotate as needed.
3. Store its value as the GitHub **environment secret** `CLOUDFLARE_API_TOKEN`
   in that environment. Do not paste it in issues, PRs, chat, source or commands.
   The account ID and project name are non-secret constants in the workflow.
   No new GitHub PAT is needed: Actions uses `contents: read` only; checkout does
   not persist credentials. GitHub deployment status API writes are not used.
4. Confirm the existing Pages project's production branch is **main**. The
   workflow explicitly deploys `--branch=main`; another configured production
   branch would cause a preview instead. Keep the existing Direct Upload project.
   No Cloudflare GitHub app installation or Cloudflare build command is needed.
5. Review and merge this PR when ready. With the secret configured, that merge
   will trigger the first production upload. To defer publication, leave the
   secret unset: verification runs, but deployment fails with a clear message.

この実装作業ではトークン作成・保存、権限変更、本番公開、mainへのマージを
行っていません。管理者が上記Environment、main制限、Pages編集権限のトークンを
設定してください。秘密の値をPRやチャットで共有する必要はありません。

## Pipeline and safety / 実行条件

`.github/workflows/ci.yml` runs `npm ci --ignore-scripts`, type checking, the
complete unit suite, two byte-identical clean builds, and desktop/phone Chromium
browser tests. Browser tests build the static site and serve the checked-in
`playground/_headers`, testing Worker rendering, SVG downloads, localization,
docs navigation and local search under the production security policy.

Only successful main push/manual runs upload `pages-assets`. The separate
`deploy` job requires `verify` and downloads that run's artifact without
rebuilding. It uses lockfile-pinned Wrangler (no runtime `latest` install).
The token is exposed only to the final deploy step, never to install/build/test
steps. PR events (including same-repository PRs), other branches and forks
cannot enter the production job; there is no `pull_request_target` or
`workflow_run` handoff of untrusted artifacts.

Production uploads are serialized and are not cancelled mid-upload. Immediately
before uploading, the job checks that its commit is still main HEAD; obsolete
queued runs and old reruns skip deployment. A newer commit arriving *after* this
check can briefly leave the just-verified older version live until the newer
run passes and deploys. GitHub concurrency can replace pending runs, so not every
intermediate commit is guaranteed a deployment.

A failed install, test, build, browser check, artifact transfer, head check or
missing token prevents the upload. The existing published site remains in place.
An upload error marks Actions failed: inspect Cloudflare's deployment status
before retrying, since a remote upload may have completed before a network error
was returned. No automated rollback or destructive cleanup runs.

`_headers` is copied by every build and included in the reproducibility check.
Its CSP permits same-origin modules, Workers, fetch/local search and blob SVG
images, denies plugins, framing, base URL changes and form submissions. It also
sets nosniff, DENY, no-referrer and camera/microphone/geolocation restrictions.
Existing page-level CSP remains in effect too. MIT, license scope/attribution
and CC-BY-SA-4.0 texts are copied and compared to their source bytes. npm
build/deploy dependencies are not shipped in the static artifact; their declared
licenses are recorded in `dependency-licenses.json`.

## Retry, verify and rollback / 再実行と確認

- **Actions → Verify Bread → Run workflow → main** rebuilds, rechecks and deploys
  current main. Selecting another branch verifies only; it cannot deploy.
- **Re-run all jobs** repeats verification of a run. **Re-run failed jobs** can
  reuse its successful verification and retained artifact. Artifacts expire
  after 7 days; use a new main workflow run if missing/expired. An old SHA is
  deliberately skipped; do not use old runs as a rollback mechanism.
- After the first authorized deployment, confirm the production deployment SHA
  in Cloudflare, visit both languages and docs/search, and check headers, e.g.
  `curl -I https://bread-playground.pages.dev/` and
  `curl -I https://bread-playground.pages.dev/docs/ja/`.
  Local tests validate our static header rule, not Cloudflare's edge behavior.
- For rollback, revert the change through a new PR and let main pass all checks,
  or have an authorized owner select a prior production deployment in Cloudflare.
  Coordinate with queued Actions runs to avoid immediately replacing a rollback.

検証失敗時は公開しません。手動再実行はActionsの「Verify Bread」からmainを
指定してください。PRからは本番公開しません。実際のCloudflare側でのヘッダーと
公開コミット確認は、管理者による初回公開後に行います。

## Official references (checked 2026-10-02)

- [Direct Upload with CI and API-token permissions](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Pages response headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Pages rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/)
