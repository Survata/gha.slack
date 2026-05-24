# gha.slack

A GitHub Action that posts Slack messages from CI workflows. Used by Upwave's backend repos to announce publishes and deployments.

## Usage

```yaml
- name: Send Slack message
  uses: Survata/gha.slack@v1
  with:
    type: build
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
| `token`   | yes      | —            | Slack bot token                      |
| `channel` | no       | `CFSRFSGP8`  | Channel ID to post to                |

### Environment variables

Common to all types: `REPOSITORY` (used as the Slack username and to load `https://s3.amazonaws.com/media.upwave.com/slack/<REPOSITORY>.png` as the icon).

Per type:

- `build`: `BUILD`, `PUSHED_BY`, `MESSAGE`
- `beforeDeployment`: `REGION`, `ENVIRONMENT`, `BUILD`, `MESSAGE`
- `afterDeployment`: `REGION`, `ENVIRONMENT`, `BUILD`, `MESSAGE`

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
REPOSITORY=keystone BUILD=1.2.3 PUSHED_BY=dave MESSAGE="local test" \
  yarn local slack build --token xoxb-... --channel C12345678
```

## Publishing a new version

All consumers reference `Survata/gha.slack@v1`. The `v1` tag is a **floating tag** — moving it rolls every consumer to the new version on their next workflow run. No consumer-side changes are required.

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
