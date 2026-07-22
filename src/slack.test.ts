// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import {
    attachmentColor,
    MAX_TOKEN_LENGTH,
    messageFactory,
    runUrl,
    slackMessageType,
    slackStatus,
    statusHeader,
    truncate,
} from './slack';

describe('test truncate()', () => {
    test('short values pass through unchanged', () => {
        expect(truncate('hello')).toBe('hello');
    });

    test('values at the boundary pass through unchanged', () => {
        const atLimit = 'x'.repeat(MAX_TOKEN_LENGTH);
        expect(truncate(atLimit)).toBe(atLimit);
    });

    test('long values are truncated with a marker', () => {
        const tooLong = 'x'.repeat(MAX_TOKEN_LENGTH + 100);
        const result = truncate(tooLong);
        expect(result.startsWith('x'.repeat(MAX_TOKEN_LENGTH))).toBe(true);
        expect(result.endsWith('…(truncated)')).toBe(true);
        // Keep total well under Slack's 3000-char section text limit.
        expect(result.length).toBeLessThan(3000);
    });
});

describe('test messageFactory()', () => {
    test('build', () => {
        const expected = {
            content: '_Build:_ %BUILD%\n_Pushed by:_ %PUSHED_BY%\n_Message:_ %MESSAGE%',
            tokens: ['BUILD', 'PUSHED_BY', 'MESSAGE'],
        };
        expect(messageFactory(slackMessageType.build)).toEqual(expected);
    });

    test('beforeDeployment', () => {
        const expected = {
            content: '_Before Deployment:_ %REGION% - %ENVIRONMENT%\n_Build:_ %BUILD%\n_Message:_ %MESSAGE%',
            tokens: ['REGION', 'ENVIRONMENT', 'BUILD', 'MESSAGE'],
        };
        expect(messageFactory(slackMessageType.beforeDeployment)).toEqual(expected);
    });

    test('afterDeployment', () => {
        // Region / environment / status now live in the header, so the body is
        // just the build version.
        const expected = {
            content: '_Build:_ %BUILD%',
            tokens: ['BUILD'],
        };
        expect(messageFactory(slackMessageType.afterDeployment)).toEqual(expected);
    });
});

describe('statusHeader()', () => {
    test('build', () => {
        expect(statusHeader(slackMessageType.build, slackStatus.success, 'keystone')).toBe('✅ keystone — published');
        expect(statusHeader(slackMessageType.build, slackStatus.failure, 'keystone')).toBe(
            '🚨 keystone — PUBLISH FAILED',
        );
    });

    test('afterDeployment includes region and environment', () => {
        expect(statusHeader(slackMessageType.afterDeployment, slackStatus.success, 'keystone', 'us', 'staging')).toBe(
            '✅ keystone — deployed (us / staging)',
        );
        expect(statusHeader(slackMessageType.afterDeployment, slackStatus.failure, 'keystone', 'us', 'staging')).toBe(
            '🚨 keystone — DEPLOY FAILED (us / staging)',
        );
    });
});

describe('attachmentColor()', () => {
    test('maps status to Slack attachment colors', () => {
        expect(attachmentColor(slackStatus.success)).toBe('good');
        expect(attachmentColor(slackStatus.failure)).toBe('danger');
    });
});

describe('runUrl()', () => {
    test('builds a run URL from the standard GitHub Actions env vars', () => {
        expect(
            runUrl({
                GITHUB_SERVER_URL: 'https://github.com',
                GITHUB_REPOSITORY: 'Survata/keystone',
                GITHUB_RUN_ID: '42',
            }),
        ).toBe('https://github.com/Survata/keystone/actions/runs/42');
    });

    test('returns undefined when any component is missing', () => {
        expect(runUrl({ GITHUB_SERVER_URL: 'https://github.com', GITHUB_REPOSITORY: 'Survata/keystone' })).toBeUndefined();
        expect(runUrl({})).toBeUndefined();
    });
});
