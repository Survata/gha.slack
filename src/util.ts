// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { slackMessageType, slackStatus } from './slack';

export namespace util {
    /**
     * Tests if the provided string is "true".
     *
     * @param val
     */
    export function isTrue(val: string | undefined): boolean {
        if (val == undefined) {
            return false;
        }
        switch (val.toLowerCase()) {
            case 'true':
            case '1':
                return true;
            default:
                return false;
        }
    }

    export function toType(val: string): slackMessageType {
        switch (val) {
            case 'build':
                return slackMessageType.build;
            case 'beforeDeployment':
                return slackMessageType.beforeDeployment;
            case 'afterDeployment':
                return slackMessageType.afterDeployment;
            default:
                throw new Error(`Unknown message type [${val}]`);
        }
    }

    /**
     * Maps the optional `status` input to a slackStatus, or undefined when it is
     * omitted (a plain message with no status indicator). "success" is success;
     * everything else non-empty — "failure" and any unrecognised value — is
     * failure: a misconfigured status must never post a green success over a real
     * failure, and we must never throw (this action must never fail the consuming
     * workflow step).
     */
    export function toStatus(val: string | undefined): slackStatus | undefined {
        if (!val) {
            return undefined;
        }
        return val === slackStatus.success ? slackStatus.success : slackStatus.failure;
    }
}
