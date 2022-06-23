// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { slackMessageType } from './slack';

export namespace util {
    /**
     * Tests if the provided string is "true".
     *
     * @param val
     */
    export function isTrue(val: string | undefined): boolean {
        switch (val?.toLowerCase()) {
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
}
