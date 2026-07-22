// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { slackMessageType, slackStatus } from './slack';

/**
 * Defines a Slack message.
 */
export interface slackArgs {
    type: slackMessageType;
    /** Optional — omit for a plain message with no status header or colour bar. */
    status?: slackStatus;
    channel: string;
    token: string;
}
