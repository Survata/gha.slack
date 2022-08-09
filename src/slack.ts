// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { Argument, Command } from 'commander';
import axios, { AxiosResponse } from 'axios';
import { slackArgs } from './slackArgs';
import { iconCreator } from './iconCreator';

/**
 * Defines the types of Slack messages.
 */
export enum slackMessageType { // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
    build = 'build', // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
    beforeDeployment = 'beforeDeployment', // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
    afterDeployment = 'afterDeployment', // eslint-disable-line no-unused-vars -- it is used, not sure why this is failing lint
}

export namespace slack {
    /**
     * Sets up the Command.
     *
     * @param program
     */
    export function setupCommand(program: Command): void {
        program
            .command('slack')
            .description('send a slack message')
            .addHelpText(
                'after',
                `\nAdditional settings per type\nall: requires these environment variables\nREPOSITORY`,
            )
            .addHelpText(
                'after',
                `\nbuild: requires these environment variables\n${messageFactory(slackMessageType.build).tokens}`,
            )
            .addHelpText(
                'after',
                `\nbeforeDeployment: requires these environment variables\n${
                    messageFactory(slackMessageType.beforeDeployment).tokens
                }`,
            )
            .addHelpText(
                'after',
                `\nafterDeployment: requires these environment variables\n${
                    messageFactory(slackMessageType.afterDeployment).tokens
                }`,
            )
            .addArgument(
                new Argument('<type>', 'the type of message to send').choices([
                    slackMessageType.build,
                    slackMessageType.beforeDeployment,
                    slackMessageType.afterDeployment,
                ]),
            )
            .option('--token <string>', 'the Slack authorization bearer token')
            .option('--channel <string>', 'the channel to send the message to')
            .action((type, options) => {
                const args: slackArgs = {
                    type: type,
                    channel: options.channel,
                    token: options.token,
                };
                slack.run(args);
            });
    }

    /**
     * Runs the Command.
     *
     * @param args
     */
    export function run(args: slackArgs): void {
        const message = messageFactory(args.type);
        let msg = message.content;
        message.tokens.forEach((t: string) => {
            const token: string = '%' + t + '%';
            const value: string = process.env[t] || 'undefined';
            msg = msg.replace(token, value);
        });

        const name: string = process.env.REPOSITORY || 'undefined';

        iconCreator.conditionallyCreate(name).then();

        const body = {
            channel: args.channel,
            blocks: [{ type: 'divider' }, { type: 'section', text: { type: 'mrkdwn', text: msg } }],
            username: `${name}`,
            icon_url: `https://s3.amazonaws.com/media.upwave.com/slack/${name}.png`,
        };

        post(args.token, body);
    }
}

/**
 * Defines a Slack message.
 */
export interface slackMessage {
    content: string;
    tokens: string[];
}

/**
 * Factory for getting a Slack message by type.
 *
 * @param type
 */
export function messageFactory(type: slackMessageType): slackMessage {
    switch (type) {
        case slackMessageType.build:
            return {
                content: '_Build:_ %BUILD%\n_Pushed by:_ %PUSHED_BY%\n_Message:_ %MESSAGE%',
                tokens: ['BUILD', 'PUSHED_BY', 'MESSAGE'],
            };
        case slackMessageType.beforeDeployment:
            return {
                content: '_Before Deployment:_ %REGION% - %ENVIRONMENT%\n_Build:_ %BUILD%\n_Message:_ %MESSAGE%',
                tokens: ['REGION', 'ENVIRONMENT', 'BUILD', 'MESSAGE'],
            };
        case slackMessageType.afterDeployment:
            return {
                content: '_After Deployment:_ %REGION% - %ENVIRONMENT%\n_Build:_ %BUILD%\n_Message:_ %MESSAGE%',
                tokens: ['REGION', 'ENVIRONMENT', 'BUILD', 'MESSAGE'],
            };
    }
}

/**
 * Performs an HTTP POST.
 *
 * @param token - the bearer token.
 * @param data - the data to post.
 */
function post(token: string, data: any) {
    axios
        .post('https://slack.com/api/chat.postMessage', data, {
            headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json; charset=UTF-8',
            },
        })
        .then((res: AxiosResponse) => {
            if (res.status != 200) {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            }
        })
        .catch((error: any) => {
            console.error(error);
        });
}
