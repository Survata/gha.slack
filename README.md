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

Requires Node 20 (see `.nvmrc`).

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

## Versioning: `v1` vs `v2`

`v2` introduced the optional `status` input and the ✅/🚨 header + colour-bar treatment. It is rolled out **opt-in**: a consumer moves from `@v1` to `@v2` by editing its own workflows to pass `status: success` on the existing notify step and add an `if: failure()` step with `status: failure`. There is no big-bang — `v1` is frozen at its last commit and un-migrated repos keep the old plain-text behaviour until their PR lands.

Within a major, the tag is still **floating**: once a repo pins `@v2`, moving the `v2` tag rolls that repo to the newest v2 bundle on its next run. The procedure below applies to patching whichever major is current (substitute `v2` for `v1`).

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
   git tag v1-rc <sha>
   git push origin v1-rc
   ```

   In a chosen consumer repo (e.g. `email-service`), temporarily change `uses: Survata/gha.slack@v1` to `uses: Survata/gha.slack@v1-rc`, run a publish, and confirm the Slack message arrives correctly. Then revert that change and proceed to step 5.

5. **Move the `v1` tag** to the new commit. This is the moment of rollout:

   ```bash
   git tag -f v1 <sha>
   git push origin v1 --force
   ```

   All 9 consumer repos pick up the new version on their next workflow run.

6. **Optional — cut an immutable version tag** for traceability:

   ```bash
   git tag v1.1.0 <sha>
   git push origin v1.1.0
   ```

7. Clean up the RC tag if you created one:

   ```bash
   git push origin :v1-rc
   git tag -d v1-rc
   ```

### Manual steps that aren't scripted

- Reviewing the regenerated `bin/index.js` diff is generally not useful — it's a 470kB webpack bundle. Trust the source diff and the tests.
- There is no Marketplace release flow. The action is not listed there; consumers reference the repo directly.
- There is no semantic-versioning automation. You decide when to cut `v1.x.y` and whether to move `v1`.
- Repository icon: each consumer expects an icon at `https://s3.amazonaws.com/media.upwave.com/slack/<repo-name>.png`. When onboarding a new consumer, upload its icon to that S3 path.

## Dependency updates (Dependabot)

Dependabot is configured in [`.github/dependabot.yml`](.github/dependabot.yml). It runs weekly and **groups** updates into a handful of consolidated PRs (production / development × version / security) rather than opening one PR per advisory.

### ⚠️ Merging a Dependabot PR is NOT a deploy

The artifact that actually runs in consumer workflows is the committed `bin/index.js` bundle, **not** `package.json` / `yarn.lock`. A Dependabot PR only updates the manifests and the lockfile — it does **not** regenerate the bundle. If you merge a Dependabot PR and stop there, every consumer keeps running the old, unpatched code that is still baked into `bin/index.js`.

To actually ship a dependency update you must rebuild the bundle and move the `v1` tag:

1. Merge (or check out) the Dependabot branch so `package.json` / `yarn.lock` are updated.

2. Reinstall, verify, and regenerate the bundle:

   ```bash
   yarn install
   yarn lint
   yarn test
   yarn package
   ```

3. Commit the regenerated bundle together with the lockfile change:

   ```bash
   git add package.json yarn.lock bin/index.js
   git commit -m "Rebuild bundle after dependency update"
   ```

4. Follow [Publishing a new version](#publishing-a-new-version) from step 4 — optionally validate via the `v1-rc` tag, then **move the `v1` tag** to the new commit. The rollout is not live until `v1` moves.

A quick way to confirm a bump actually reached the bundle: after `yarn package`, grep `bin/index.js` for the new version string or the patched code before moving `v1`.
