// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import * as core from '@actions/core';
import { util } from './util';
import { program } from 'commander';
import { slack } from './slack';
import { slackArgs } from './slackArgs';

if (util.isTrue(process.env.GITHUB_ACTIONS)) {
    const args: slackArgs = {
        type: util.toType(core.getInput('type')),
        channel: core.getInput('channel'),
        token: core.getInput('token'),
    };
    slack.run(args);
} else {
    slack.setupCommand(program);
    program.parse(process.argv);
}
