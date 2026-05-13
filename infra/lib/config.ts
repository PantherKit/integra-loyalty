export type Env = 'dev' | 'stage' | 'prod';

export interface EnvConfig {
  env: Env;
  tableName: string;
  apiDomain: string;
  cognitoUserPoolName: string;
  budgetUsd: number;
  budgetAlertEmail: string;
  logRetentionDays: number;
}

const CONFIGS: Record<Env, EnvConfig> = {
  dev: {
    env: 'dev',
    tableName: 'integra-loyalty-dev',
    apiDomain: 'dev.integra-loyalty.integra-group.ai',
    cognitoUserPoolName: 'integra-loyalty-dev',
    budgetUsd: 10,
    budgetAlertEmail: 'jorgejimenez@integra-group.ai',
    logRetentionDays: 7,
  },
  stage: {
    env: 'stage',
    tableName: 'integra-loyalty-stage',
    apiDomain: 'stage.integra-loyalty.integra-group.ai',
    cognitoUserPoolName: 'integra-loyalty-stage',
    budgetUsd: 25,
    budgetAlertEmail: 'jorgejimenez@integra-group.ai',
    logRetentionDays: 30,
  },
  prod: {
    env: 'prod',
    tableName: 'integra-loyalty-prod',
    apiDomain: 'app.integra-loyalty.integra-group.ai',
    cognitoUserPoolName: 'integra-loyalty-prod',
    budgetUsd: 60,
    budgetAlertEmail: 'jorgejimenez@integra-group.ai',
    logRetentionDays: 90,
  },
};

export function loadConfig(env: Env): EnvConfig {
  const config = CONFIGS[env];
  if (!config) throw new Error(`Unknown env: ${env}`);
  return config;
}
