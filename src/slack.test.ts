// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { messageFactory, slackMessageType } from './slack';

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
