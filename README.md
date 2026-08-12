# gha.slack

A GitHub Action that posts Slack messages from CI workflows. Used by Upwave's backend repos to announce publishes and deployments.

## Usage

Success notification — pass `status: success` for the ✅ header:

```yaml
- name: Send Slack message
  uses: Survata/gha.slack@v2
  with:
    type: build
    status: success
    token: ${{ secrets.SLACK_BOT_TOKEN }}
  env:
    REPOSITORY: ${{ github.event.repository.name }}
    BUILD: ${{ env.DEPLOY_VERSION }}
    PUSHED_BY: ${{ github.event.pusher.name }}
    MESSAGE: ${{ github.event.head_commit.message }}
```

Failure notification — an `if: failure()` step with `status: failure`:

```yaml
- name: Send Slack message (if failed)
  uses: Survata/gha.slack@v2
  if: failure()
  with:
    type: build
    status: failure
    token: ${{ secrets.SLACK_BOT_TOKEN }}
  env:
    REPOSITORY: ${{ github.event.repository.name }}
    BUILD: ${{ env.DEPLOY_VERSION }}
    PUSHED_BY: ${{ github.event.pusher.name }}
    MESSAGE: ${{ github.event.head_commit.message }}
```

### Inputs

| Input     | Required | Default      | Description                          |
|-----------|----------|--------------|--------------------------------------|
| `type`    | yes      | —            | `build`, `beforeDeployment`, or `afterDeployment` |
| `status`  | no       | *(none)*     | `success` or `failure` — sets the header emoji and colour bar. Omit for a plain message with no status indicator |
| `token`   | yes      | —            | Slack bot token                      |
| `channel` | no       | `CFSRFSGP8`  | Channel ID to post to                |

### Status & failure highlighting

`status` is **optional** and has three renderings:

- `success` → green ("good") bar + bold header `✅ <repo> — published` / `✅ <repo> — deployed (<region> / <env>)`.
- `failure` → red ("danger") bar + bold header `🚨 <repo> — PUBLISH FAILED` / `🚨 <repo> — DEPLOY FAILED (<region> / <env>)`, plus a `View run ↗` link to the failed Actions run.
- **omitted** → a plain message (no header, no colour bar) — for notifications where a success/failure status doesn't apply.

For `success`/`failure`, the run link is built from the runner's own `GITHUB_SERVER_URL` / `GITHUB_REPOSITORY` / `GITHUB_RUN_ID`, so no workflow wiring is required for it. An unrecognised non-empty `status` is treated as `failure` (never a false success), and the action never fails the workflow step over a bad value.

### Environment variables

Common to all types: `REPOSITORY` (used as the Slack username and to load `https://s3.amazonaws.com/media.upwave.com/slack/<REPOSITORY>.png` as the icon).

Per type:

- `build`: `BUILD`, `PUSHED_BY`, `MESSAGE`
- `beforeDeployment`: `REGION`, `ENVIRONMENT`, `BUILD`, `MESSAGE`
- `afterDeployment`: `REGION`, `ENVIRONMENT`, `BUILD` (`REGION`/`ENVIRONMENT` appear in the header; the deploy body is just the build version)

Long values (e.g. multi-paragraph commit messages) are truncated to 2800 chars to fit Slack's 3000-char section limit.

Slack send failures are logged as warnings but never fail the workflow step — by the time this action runs, the publish or deploy has already happened.

## Development

Requires Node 24 (see `.nvmrc`).

```bash
nvm use
yarn install
yarn test       # tsc + jest
yarn lint
yarn package    # rebuilds bin/index.js
```

The action runs `bin/index.js`, which is a committed bundle produced by `@vercel/ncc`. **You must run `yarn package` after any source change** and commit the regenerated `bin/index.js` along with the source.

### Local testing without GitHub Actions

When `GITHUB_ACTIONS` is unset, `index.ts` exposes a CLI:

```bash
# Success (✅ header, green bar):
REPOSITORY=keystone BUILD=1.2.3 PUSHED_BY=dave MESSAGE="local test" \
  yarn local slack build --status success --token xoxb-... --channel C12345678

# Failure (🚨 header, red bar, run link):
REPOSITORY=keystone BUILD=1.2.3 PUSHED_BY=dave MESSAGE="local test" \
  GITHUB_SERVER_URL=https://github.com GITHUB_REPOSITORY=Survata/keystone GITHUB_RUN_ID=123 \
  yarn local slack build --status failure --token xoxb-... --channel C12345678

# No status (plain message — omit --status):
REPOSITORY=keystone BUILD=1.2.3 PUSHED_BY=dave MESSAGE="local test" \
  yarn local slack build --token xoxb-... --channel C12345678
```

## Versioning: `v2` is the live tag

`v2` introduced the optional `status` input and the ✅/🚨 header + colour-bar treatment. **The migration is complete — every consumer now pins `@v2`, and `v1` has no references left.** The `v1` tag is left in place, frozen at its last commit, purely so any stale reference outside the known consumer list keeps resolving. Don't move it, and don't add features to it.

`v2` is a **floating** tag: moving it rolls every consumer to the newest bundle on their next workflow run. All the procedures below operate on `v2`.

## Publishing a new version

The floating major tag rolls every consumer pinned to it to the new bundle on their next workflow run. No consumer-side changes are required for a same-major bundle update.

### Procedure

1. Make and commit your source changes.

2. Regenerate the bundle and verify locally:

   ```bash
   yarn install
   yarn lint
   yarn test
   yarn package
   ```

3. Commit the regenerated bundle alongside the source change:

   ```bash
   git add src/ bin/index.js package.json yarn.lock action.yaml
   git commit -m "Describe the change"
   git push origin master
   ```

4. **Optional but recommended for non-trivial changes — staged rollout via release-candidate tag.** Push a temporary tag, point one low-stakes consumer at it, watch one publish cycle, then promote:

   ```bash
   git tag v2-rc <sha>
   git push origin v2-rc
   ```

   In a chosen consumer repo (e.g. `email-service`), temporarily change `uses: Survata/gha.slack@v2` to `uses: Survata/gha.slack@v2-rc`, run a publish, and confirm the Slack message arrives correctly. Then revert that change and proceed to step 5.

5. **Move the `v2` tag** to the new commit. This is the moment of rollout:

   ```bash
   git tag -f v2 <sha>
   git push origin v2 --force
   ```

   All 9 consumer repos pick up the new version on their next workflow run.

6. **Optional — cut an immutable version tag** for traceability:

   ```bash
   git tag v2.1.0 <sha>
   git push origin v2.1.0
   ```

7. Clean up the RC tag if you created one:

   ```bash
   git push origin :v2-rc
   git tag -d v2-rc
   ```

### Manual steps that aren't scripted

- Reviewing the regenerated `bin/index.js` diff is generally not useful — it's a 470kB webpack bundle. Trust the source diff and the tests.
- There is no Marketplace release flow. The action is not listed there; consumers reference the repo directly.
- There is no semantic-versioning automation. You decide when to cut `v2.x.y` and whether to move `v2`.
- Repository icon: each consumer expects an icon at `https://s3.amazonaws.com/media.upwave.com/slack/<repo-name>.png`. When onboarding a new consumer, upload its icon to that S3 path.

## Dependency updates (Dependabot)

Dependabot is configured in [`.github/dependabot.yml`](.github/dependabot.yml) for two ecosystems. **npm** runs weekly and **groups** updates into a handful of consolidated PRs (production / development × version / security) rather than opening one PR per advisory. **github-actions** runs monthly and keeps the SHA-pinned actions in `.github/workflows` current. The rest of this section is about npm PRs — a github-actions PR only bumps a pinned action ref, so it never touches the bundle and never needs a `v2` move.

### ⚠️ Merging an npm Dependabot PR is NOT a deploy

The artifact that actually runs in consumer workflows is the committed `bin/index.js` bundle, **not** `package.json` / `yarn.lock`. A Dependabot PR only updates the manifests and the lockfile — it does **not** regenerate the bundle. If you merge a Dependabot PR and stop there, every consumer keeps running the old, unpatched code that is still baked into `bin/index.js`.

To actually ship a dependency update you must rebuild the bundle and move the `v2` tag — **unless the bump never reaches the bundle**, which for this repo is the common case. Step 3 is where you find out which situation you're in; don't skip ahead to the tag move.

1. Merge (or check out) the Dependabot branch so `package.json` / `yarn.lock` are updated.

2. Reinstall, verify, and regenerate the bundle:

   ```bash
   yarn install
   yarn lint
   yarn test
   yarn package
   ```

3. **Decide whether this bump ships anything at all**, by checking whether the rebuild changed the bundle:

   ```bash
   git status --porcelain bin/index.js
   ```

   **No output — the bundle is byte-identical.** The advisory was for a dev-only *runtime* dependency (eslint, Jest, or one of their transitive deps) that never enters the shipped artifact. There is nothing to roll out: commit `package.json` and `yarn.lock` alone, leave `bin/index.js` untouched, and **do not move `v2`**. You are done — stop here.

   **The bundle changed.** The dependency is baked into the shipped artifact, so continue to step 4. Note this also covers `typescript` and `@vercel/ncc`: they are devDependencies, but they *build* the bundle, so bumping either rewrites it and it does need to ship.

4. Commit the regenerated bundle together with the lockfile change:

   ```bash
   git add package.json yarn.lock bin/index.js
   git commit -m "Rebuild bundle after dependency update"
   ```

5. Follow [Publishing a new version](#publishing-a-new-version) from step 4 — optionally validate via the `v2-rc` tag, then **move the `v2` tag** to the new commit. The rollout is not live until `v2` moves.

To confirm a bump actually reached the bundle beyond the byte-comparison in step 3, grep `bin/index.js` for the new version string or the patched code before moving `v2`.
