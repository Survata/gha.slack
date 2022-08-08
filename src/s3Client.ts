// Copyright (c) 2022 Upwave, All Rights Reserved

'use strict';

import { HeadObjectCommand, HeadObjectCommandInput, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export namespace s3Client {
    export async function checkIfExists(name: string): Promise<boolean> {
        try {
            const client = new S3Client({});
            const request: HeadObjectCommandInput = {
                Bucket: 'media.upwave.com',
                Key: `slack/${name}.png`,
            };
            const headObjectCommand = new HeadObjectCommand(request);
            const response = await client.send(headObjectCommand);
            return response.$metadata.httpStatusCode === 200;
        } catch (error) {
            return false;
        }
    }

    export async function save(name: string, body: any): Promise<void> {
        const client = new S3Client({});
        const request = {
            Bucket: 'media.upwave.com',
            Key: `slack/${name}.png`,
            Body: body,
            ACL: 'public-read',
        };
        await client.send(new PutObjectCommand(request));
    }
}
