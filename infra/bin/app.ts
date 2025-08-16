#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { YafaStack } from '../lib/yafa-stack';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

new YafaStack(app, 'YafaStack', {
  env: { account, region },
  tags: {
    Project: 'yafa-ms',
    Environment: 'prod',
    Owner: 'yafa-break-glass',
  },
});

