import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integ from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';
import * as path from 'path';
import { EnvConfig } from './config';

export interface IntegraLoyaltyStackProps extends cdk.StackProps {
  config: EnvConfig;
}

export class IntegraLoyaltyStack extends cdk.Stack {
  public readonly table: ddb.Table;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: IntegraLoyaltyStackProps) {
    super(scope, id, props);
    const { config } = props;

    // ============================================================
    // DynamoDB single-table — ADR-002
    // ============================================================
    this.table = new ddb.Table(this, 'Table', {
      tableName: config.tableName,
      partitionKey: { name: 'PK', type: ddb.AttributeType.STRING },
      sortKey: { name: 'SK', type: ddb.AttributeType.STRING },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: config.env !== 'dev',
      removalPolicy: config.env === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    // ============================================================
    // Lambda — API handler — ADR-001
    // ============================================================
    const apiFn = new nodeLambda.NodejsFunction(this, 'ApiHandler', {
      functionName: `integra-loyalty-${config.env}-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(__dirname, '../../api/src/index.ts'),
      handler: 'handler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      logRetention: config.logRetentionDays as unknown as logs.RetentionDays,
      environment: {
        TABLE_NAME: config.tableName,
        ENV: config.env,
      },
      bundling: {
        format: nodeLambda.OutputFormat.ESM,
        target: 'node20',
        minify: true,
        sourceMap: true,
      },
    });

    this.table.grantReadWriteData(apiFn);

    // ============================================================
    // API Gateway HTTP API — ADR-001 (HTTP, no REST = 70% más barato)
    // ============================================================
    const httpApi = new apigw.HttpApi(this, 'HttpApi', {
      apiName: `integra-loyalty-${config.env}-api`,
      description: `Integra Loyalty API — ${config.env}`,
      corsPreflight: {
        allowOrigins: ['*'], // TODO: restringir en prod a dominios conocidos
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
      },
    });

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: new integ.HttpLambdaIntegration('LambdaIntegration', apiFn),
    });

    this.apiUrl = httpApi.apiEndpoint;

    // ============================================================
    // Budget alerts — ADR-004
    // ============================================================
    new budgets.CfnBudget(this, 'EnvBudget', {
      budget: {
        budgetName: `integra-loyalty-${config.env}`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: config.budgetUsd, unit: 'USD' },
        costFilters: { TagKeyValue: [`user:Project$integra-loyalty`, `user:Environment$${config.env}`] },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: config.budgetAlertEmail }],
        },
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [{ subscriptionType: 'EMAIL', address: config.budgetAlertEmail }],
        },
      ],
    });

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'TableName', { value: this.table.tableName });
    new cdk.CfnOutput(this, 'ApiUrl', { value: this.apiUrl });
  }
}
