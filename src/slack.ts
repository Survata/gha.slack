// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { Argument, Command } from 'commander';
import { HttpClient } from '@actions/http-client';
import * as core from '@actions/core';
import { slackArgs } from './slackArgs';

/**
 * Slack rejects section block text fields longer than 3000 chars, so we truncate
 * each substituted token to leave headroom for surrounding markdown/labels. The
 * commit message is the usual culprit (squash merges, co-author trailers, etc).
 */
export const MAX_TOKEN_LENGTH = 2800;
const TRUNCATION_SUFFIX = '\n…(truncated)';

export function truncate(value: string, max: number = MAX_TOKEN_LENGTH): string {
    return value.length <= max ? value : value.slice(0, max) + TRUNCATION_SUFFIX;
}

/**
 * Defines the types of Slack messages.
 */
export enum slackMessageType { // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
    build = 'build', // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
    beforeDeployment = 'beforeDeployment', // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
    afterDeployment = 'afterDeployment', // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
}

/**
 * Whether the reported publish/deploy succeeded or failed. Drives the header
 * emoji and the attachment colour bar.
 */
export enum slackStatus { // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
    success = 'success', // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
    failure = 'failure', // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
}

const HEADER_EMOJI: Record<slackStatus, string> = {
    [slackStatus.success]: '✅',
    [slackStatus.failure]: '🚨',
};

/**
 * The Slack attachment colour for a status — a green ("good") or red ("danger")
 * bar down the left of the message, so failures are obvious at a glance.
 */
export function attachmentColor(status: slackStatus): 'good' | 'danger' {
    return status === slackStatus.failure ? 'danger' : 'good';
}

/**
 * Builds the bold header line, e.g. `🚨 keystone — PUBLISH FAILED` or
 * `✅ keystone — deployed (us / staging)`.
 */
export function statusHeader(
    type: slackMessageType,
    status: slackStatus,
    repository: string,
    region?: string,
    environment?: string,
): string {
    const emoji: string = HEADER_EMOJI[status];
    const failed: boolean = status === slackStatus.failure;
    const location: string = region && environment ? ` (${region} / ${environment})` : '';
    switch (type) {
        case slackMessageType.build:
            return `${emoji} ${repository} — ${failed ? 'PUBLISH FAILED' : 'published'}`;
        case slackMessageType.beforeDeployment:
            return `${emoji} ${repository} — ${failed ? 'DEPLOYMENT FAILED' : 'deploying'}${location}`;
        case slackMessageType.afterDeployment:
            return `${emoji} ${repository} — ${failed ? 'DEPLOY FAILED' : 'deployed'}${location}`;
    }
}

/**
 * A deep-link to the current Actions run, built from the runner's standard
 * environment variables (always present under GitHub Actions). Returns
 * undefined when any component is missing, so callers can omit the link rather
 * than emit a broken one.
 */
export function runUrl(env: Record<string, string | undefined> = process.env): string | undefined {
    const server: string | undefined = env.GITHUB_SERVER_URL;
    const repository: string | undefined = env.GITHUB_REPOSITORY;
    const runId: string | undefined = env.GITHUB_RUN_ID;
    if (!server || !repository || !runId) {
        return undefined;
    }
    return `${server}/${repository}/actions/runs/${runId}`;
}

export namespace slack {
    /**
     * Sets up the Command.
     *
     * @param program
     */
    export function setupCommand(program: Command): void {
        program
            .command('slack')
            .description('send a slack message')
            .addHelpText(
                'after',
                `\nAdditional settings per type\nall: requires these environment variables\nREPOSITORY`,
            )
            .addHelpText(
                'after',
                `\nbuild: requires these environment variables\n${messageFactory(slackMessageType.build).tokens}`,
            )
            .addHelpText(
                'after',
                `\nbeforeDeployment: requires these environment variables\n${
                    messageFactory(slackMessageType.beforeDeployment).tokens
                }`,
            )
            .addHelpText(
                'after',
                `\nafterDeployment: requires these environment variables\n${
                    messageFactory(slackMessageType.afterDeployment).tokens
                }`,
            )
            .addArgument(
                new Argument('<type>', 'the type of message to send').choices([
                    slackMessageType.build,
                    slackMessageType.beforeDeployment,
                    slackMessageType.afterDeployment,
                ]),
            )
            .option('--token <string>', 'the Slack authorization bearer token')
            .option('--channel <string>', 'the channel to send the message to')
            .option('--status <string>', 'success (default) or failure')
            .action(async (type, options) => {
                const args: slackArgs = {
                    type: type,
                    // Mirrors util.toStatus: anything that isn't an explicit failure is a success.
                    status: options.status === slackStatus.failure ? slackStatus.failure : slackStatus.success,
                    channel: options.channel,
                    token: options.token,
                };
                await slack.run(args);
            });
    }

    /**
     * Runs the Command.
     *
     * @param args
     */
    export async function run(args: slackArgs): Promise<void> {
        await post(args.token, buildBody(args));
    }
}

/**
 * Assembles the Slack `chat.postMessage` payload for a message. Pure w.r.t. the
 * environment it reads (REPOSITORY / message tokens / REGION / ENVIRONMENT and,
 * for failures, the GitHub run vars), so it can be unit-tested and rendered
 * without sending anything.
 */
export function buildBody(args: slackArgs): object {
    const message = messageFactory(args.type);
    let msg = message.content;
    message.tokens.forEach((t: string) => {
        const token: string = '%' + t + '%';
        const value: string = truncate(process.env[t] || 'undefined');
        msg = msg.replace(token, value);
    });

    const name: string = process.env.REPOSITORY || 'undefined';
    const header: string = statusHeader(args.type, args.status, name, process.env.REGION, process.env.ENVIRONMENT);

    const blocks: any[] = [
        { type: 'header', text: { type: 'plain_text', text: header, emoji: true } },
        { type: 'divider' },
        { type: 'section', text: { type: 'mrkdwn', text: msg } },
    ];

    // Only failures carry a run link — it's the actionable bit when something breaks.
    if (args.status === slackStatus.failure) {
        const url: string | undefined = runUrl();
        if (url) {
            blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `<${url}|View run ↗>` }] });
        }
    }

    return {
        channel: args.channel,
        username: `${name}`,
        icon_url: `https://s3.amazonaws.com/media.upwave.com/slack/${name}.png`,
        attachments: [{ color: attachmentColor(args.status), blocks }],
    };
}

/**
 * Defines a Slack message.
 */
export interface slackMessage {
    content: string;
    tokens: string[];
}

/**
 * Factory for getting a Slack message by type.
 *
 * @param type
 */
export function messageFactory(type: slackMessageType): slackMessage {
    switch (type) {
        case slackMessageType.build:
            return {
                content: '_Build:_ %BUILD%\n_Pushed by:_ %PUSHED_BY%\n_Message:_ %MESSAGE%',
                tokens: ['BUILD', 'PUSHED_BY', 'MESSAGE'],
            };
        case slackMessageType.beforeDeployment:
            return {
                content: '_Before Deployment:_ %REGION% - %ENVIRONMENT%\n_Build:_ %BUILD%\n_Message:_ %MESSAGE%',
                tokens: ['REGION', 'ENVIRONMENT', 'BUILD', 'MESSAGE'],
            };
        case slackMessageType.afterDeployment:
            // Region / environment / status are carried by the header, so the
            // body only needs the build version.
            return {
                content: '_Build:_ %BUILD%',
                tokens: ['BUILD'],
            };
    }
}

/**
 * Performs an HTTP POST to Slack. Best-effort: a failed send is logged as a
 * warning but never fails the step — the artifact (publish/deploy) has already
 * happened by the time we get here, so reporting it as a failed step would
 * misrepresent what actually happened.
 *
 * @param token - the bearer token.
 * @param data - the data to post.
 */
async function post(token: string, data: any): Promise<void> {
    try {
        const client = new HttpClient();
        // postJson serialises the body and sets Accept/Content-Type: application/json.
        const res = await client.postJson<{ ok?: boolean }>('https://slack.com/api/chat.postMessage', data, {
            Authorization: 'Bearer ' + token,
        });
        // Slack returns HTTP 200 with `ok: false` for application-level errors
        // (e.g. invalid_blocks when text > 3000 chars), so the HTTP status alone
        // isn't enough.
        if (res.statusCode !== 200 || !res.result?.ok) {
            core.warning(`Slack message not sent: status=${res.statusCode} body=${JSON.stringify(res.result)}`);
        }
    } catch (error: any) {
        core.warning(`Slack message not sent: ${error?.message || error}`);
    }
}
