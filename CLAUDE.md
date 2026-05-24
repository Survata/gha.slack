# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this is

A custom GitHub Action that posts Slack messages on publish / before-deployment / after-deployment events. Written in TypeScript, bundled to a single JS file with `@vercel/ncc`, and consumed by every Upwave backend repo via `uses: Survata/gha.slack@v1`.

Not published to the GitHub Marketplace. It works because any public repo with an `action.yaml` at the root is usable as an action by reference (`owner/repo@ref`).

## Layout

- `src/` — TypeScript sources (`index.ts` entry, `slack.ts` core, `util.ts`, `slackArgs.ts`, tests).
- `bin/index.js` — **committed build artifact**. This is what GitHub Actions actually executes. Regenerate with `yarn package` after any source change. Never hand-edit.
- `action.yaml` — action manifest. `using: node20` must match `.nvmrc`.
- `.nvmrc` — pins Node 20 for local dev. `nvm use` to activate.

## Build & test

```
yarn install
yarn test       # tsc + jest
yarn lint
yarn package    # tsc + ncc → bin/index.js
```

`yarn package` is required before committing any source change — the bundle is what runs in CI, not the TS sources.

## Critical conventions

- **Best-effort Slack send.** A Slack API failure must never fail the consuming workflow step. By the time this action runs, the publish/deploy has already happened — failing the step would misrepresent reality. Use `core.warning`, never `core.setFailed`. See [`post()` in src/slack.ts](src/slack.ts).
- **Truncate substituted tokens.** Slack rejects section-block `text` fields longer than 3000 chars. `MAX_TOKEN_LENGTH = 2800` leaves headroom for surrounding markdown. Commit messages are the usual culprit.
- **Slack returns HTTP 200 on app-level errors.** Always check `res.data.ok`, not just `res.status`.
- **Local CLI mode exists.** When `GITHUB_ACTIONS` is unset, `index.ts` falls through to a commander-based CLI for manual testing. Set the required env vars (see `messageFactory` in `src/slack.ts`) and run `yarn local slack <type> --token ... --channel ...`.

## Publishing

See [README.md](README.md) for the publish procedure. Key thing to remember: all consumers pin `@v1`, so moving the `v1` tag rolls everyone in one shot. There is no per-consumer change required.

## Consumers

Currently used by 9 repos: keystone, survata-dashboard, survata-jobs, survata-surveywall-api, campaign-creator, email-service, llm-orchestrator, survata-com, upwave-app. All pin `@v1`. Any breaking change must keep `@v1` working or coordinate updates across all of them.
