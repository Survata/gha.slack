// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { MAX_TOKEN_LENGTH, messageFactory, slackMessageType, truncate } from './slack';

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
        const expected = {
            content: '_After Deployment:_ %REGION% - %ENVIRONMENT%\n_Build:_ %BUILD%\n_Message:_ %MESSAGE%',
            tokens: ['REGION', 'ENVIRONMENT', 'BUILD', 'MESSAGE'],
        };
        expect(messageFactory(slackMessageType.afterDeployment)).toEqual(expected);
    });
});
