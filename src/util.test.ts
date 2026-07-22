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

    test('treats empty/undefined as no status (the input is optional)', () => {
        // Omitting `status` means "no status indicator" — not a claimed success.
        expect(util.toStatus('')).toBeUndefined();
        expect(util.toStatus(undefined)).toBeUndefined();
    });

    test('treats an unrecognised non-empty value as failure, never a false success', () => {
        // A misconfigured/typo'd status must never post a green ✅ over a real
        // failure — fail toward alerting. (Not a throw: this action must never
        // fail the consuming workflow step.)
        expect(util.toStatus('cancelled')).toBe(slackStatus.failure);
        expect(util.toStatus('faliure')).toBe(slackStatus.failure);
    });
});
