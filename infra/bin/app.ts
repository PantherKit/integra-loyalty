#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { IntegraLoyaltyStack } from '../lib/integra-loyalty-stack';
import { loadConfig, Env } from '../lib/config';

const app = new cdk.App();
const accounts = app.node.tryGetContext('accounts') as Record<Env, string>;
const region = app.node.tryGetContext('region') as string;

const envs: Env[] = ['dev', 'stage'];
// 'prod' se suma cuando se confirme account dedicado (ver ADR-003)

for (const env of envs) {
  const account = accounts[env];
  if (!account || account === 'TBD') continue;

  new IntegraLoyaltyStack(app, `IntegraLoyalty-${env}`, {
    env: { account, region },
    config: loadConfig(env),
    description: `Integra Loyalty backend stack — env=${env}`,
    tags: {
      Project: 'integra-loyalty',
      Environment: env,
      ManagedBy: 'cdk',
      Owner: 'integra-group',
    },
  });
}
