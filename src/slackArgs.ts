// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { slackMessageType, slackStatus } from './slack';

/**
 * Defines a Slack message.
 */
export interface slackArgs {
    type: slackMessageType;
    status: slackStatus;
    channel: string;
    token: string;
}
