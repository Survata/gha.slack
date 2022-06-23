// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { slackMessageType } from './slack';

/**
 * Defines a Slack message.
 */
export interface slackArgs {
    type: slackMessageType;
    channel: string;
    token: string;
}
