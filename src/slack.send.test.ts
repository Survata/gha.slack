// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { HttpClient } from '@actions/http-client';
import * as core from '@actions/core';
import { slack, slackMessageType } from './slack';

jest.mock('@actions/http-client');
jest.mock('@actions/core');

const postJson = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(HttpClient).mockImplementation(() => ({ postJson } as unknown as HttpClient));
    process.env.REPOSITORY = 'keystone';
    process.env.BUILD = '1.2.3';
    process.env.PUSHED_BY = 'dave';
    process.env.MESSAGE = 'a commit message';
});

const args = { type: slackMessageType.build, channel: 'C12345678', token: 'xoxb-test-token' };

describe('slack.run() Slack send via @actions/http-client', () => {
    test('posts to chat.postMessage with bearer auth and the substituted body', async () => {
        postJson.mockResolvedValue({ statusCode: 200, result: { ok: true } });

        await slack.run(args);

        expect(postJson).toHaveBeenCalledTimes(1);
        const [url, body, headers] = postJson.mock.calls[0];
        expect(url).toBe('https://slack.com/api/chat.postMessage');
        expect(headers).toEqual({ Authorization: 'Bearer xoxb-test-token' });
        expect(body.channel).toBe('C12345678');
        expect(body.username).toBe('keystone');
        expect(body.icon_url).toContain('/keystone.png');
        // %BUILD% / %MESSAGE% tokens are substituted from the environment.
        expect(JSON.stringify(body.blocks)).toContain('1.2.3');
        expect(JSON.stringify(body.blocks)).toContain('a commit message');
        expect(core.warning).not.toHaveBeenCalled();
    });

    test('warns but does not throw when Slack responds ok:false on HTTP 200', async () => {
        // Slack returns 200 with ok:false for app-level errors (e.g. invalid_blocks).
        postJson.mockResolvedValue({ statusCode: 200, result: { ok: false, error: 'invalid_blocks' } });

        await expect(slack.run(args)).resolves.toBeUndefined();

        expect(core.warning).toHaveBeenCalledTimes(1);
        expect(jest.mocked(core.warning).mock.calls[0][0]).toContain('invalid_blocks');
    });

    test('warns but does not throw when the request itself rejects (best-effort)', async () => {
        postJson.mockRejectedValue(new Error('network down'));

        await expect(slack.run(args)).resolves.toBeUndefined();

        expect(core.warning).toHaveBeenCalledTimes(1);
        expect(jest.mocked(core.warning).mock.calls[0][0]).toContain('network down');
    });

    test('truncates an over-long token value to stay under Slack section limits', async () => {
        postJson.mockResolvedValue({ statusCode: 200, result: { ok: true } });
        process.env.MESSAGE = 'x'.repeat(5000);

        await slack.run(args);

        const [, body] = postJson.mock.calls[0];
        const text = body.blocks[1].text.text;
        expect(text).toContain('…(truncated)');
        expect(text.length).toBeLessThan(3000);
    });
});
