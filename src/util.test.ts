// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { util } from './util';
import { slackMessageType, slackStatus } from './slack';

describe('test running under github action', () => {
    test('', () => {
        expect(util.isTrue(undefined)).toBe(false);
        expect(util.isTrue('false')).toBe(false);
        expect(util.isTrue('0')).toBe(false);
        expect(util.isTrue('true')).toBe(true);
        expect(util.isTrue('1')).toBe(true);
    });
});

describe('test running under github action', () => {
    test('', () => {
        expect(() => {
            util.toType('foobar');
        }).toThrow(new Error('Unknown message type [foobar]'));
        expect(util.toType('build')).toBe(slackMessageType.build);
        expect(util.toType('beforeDeployment')).toBe(slackMessageType.beforeDeployment);
        expect(util.toType('afterDeployment')).toBe(slackMessageType.afterDeployment);
    });
});

describe('toStatus', () => {
    test('maps the explicit values', () => {
        expect(util.toStatus('success')).toBe(slackStatus.success);
        expect(util.toStatus('failure')).toBe(slackStatus.failure);
    });

    test('defaults to success for empty, undefined, or unrecognised values', () => {
        // The `status` input is optional (default success), so anything that
        // isn't an explicit failure must be treated as a success.
        expect(util.toStatus('')).toBe(slackStatus.success);
        expect(util.toStatus(undefined)).toBe(slackStatus.success);
        expect(util.toStatus('cancelled')).toBe(slackStatus.success);
    });
});
