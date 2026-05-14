import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integ from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';
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
    // DynamoDB single-table — ADR-002 + docs/architecture/data-model.md
    // ============================================================
    this.table = new ddb.Table(this, 'Table', {
      tableName: config.tableName,
      partitionKey: { name: 'PK', type: ddb.AttributeType.STRING },
      sortKey: { name: 'SK', type: ddb.AttributeType.STRING },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: config.env !== 'dev' },
      removalPolicy: config.env === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });

    // GSI1 — lookup user por email (AP-2 del data model)
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: ddb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: ddb.AttributeType.STRING },
      projectionType: ddb.ProjectionType.ALL,
    });

    // ============================================================
    // Cognito User Pool — auth multi-tenant (Slice 1: email+password)
    // ============================================================
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: config.cognitoUserPoolName,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: config.env === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      // Custom attributes para multi-tenancy — JWT incluye estos claims
      customAttributes: {
        tenantId: new cognito.StringAttribute({ minLen: 1, maxLen: 64, mutable: false }),
        role: new cognito.StringAttribute({ minLen: 1, maxLen: 16, mutable: true }),
      },
    });

    const userPoolClient = userPool.addClient('Client', {
      userPoolClientName: `${config.cognitoUserPoolName}-client`,
      authFlows: {
        adminUserPassword: true, // ADMIN_USER_PASSWORD_AUTH desde Lambda backend
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // ============================================================
    // Lambda — API handler — ADR-001
    // ============================================================
    const retentionMap: Record<number, logs.RetentionDays> = {
      7: logs.RetentionDays.ONE_WEEK,
      30: logs.RetentionDays.ONE_MONTH,
      90: logs.RetentionDays.THREE_MONTHS,
    };

    const apiLogGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/lambda/integra-loyalty-${config.env}-api`,
      retention: retentionMap[config.logRetentionDays] ?? logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiFn = new nodeLambda.NodejsFunction(this, 'ApiHandler', {
      functionName: `integra-loyalty-${config.env}-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(__dirname, '../../api/src/index.ts'),
      handler: 'handler',
      projectRoot: path.join(__dirname, '../../api'),
      depsLockFilePath: path.join(__dirname, '../../api/package-lock.json'),
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      logGroup: apiLogGroup,
      environment: {
        TABLE_NAME: config.tableName,
        ENV: config.env,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        AWS_REGION_HINT: this.region,
      },
      bundling: {
        format: nodeLambda.OutputFormat.ESM,
        target: 'node20',
        minify: true,
        sourceMap: true,
      },
    });

    this.table.grantReadWriteData(apiFn);

    // Grant a Lambda para hacer SignUp + AdminConfirm + InitiateAuth en Cognito
    userPool.grant(
      apiFn,
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminSetUserPassword',
      'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:AdminInitiateAuth',
      'cognito-idp:AdminGetUser'
    );

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
    // ============================================================
    // Frontend hosting — S3 (private) + CloudFront con OAC
    // ============================================================
    const siteBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `integra-loyalty-${config.env}-web-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: config.env === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: config.env === 'dev',
    });

    // Rewrite /path/ → /path/index.html para Next.js static export con trailingSlash
    const indexRewriteFn = new cloudfront.Function(this, 'IndexRewriteFn', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '/index.html';
  }
  return request;
}
      `),
    });

    const distribution = new cloudfront.Distribution(this, 'WebDistribution', {
      comment: `integra-loyalty-${config.env} web`,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // ADR-004 cost guardrail
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [
          { function: indexRewriteFn, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
      errorResponses: [
        // Next.js static export sirve /xxx/index.html — para 404 mostramos custom
        { httpStatus: 404, responsePagePath: '/404.html', responseHttpStatus: 404, ttl: cdk.Duration.minutes(5) },
        { httpStatus: 403, responsePagePath: '/404.html', responseHttpStatus: 404, ttl: cdk.Duration.minutes(5) },
      ],
    });

    // Sync web/out/ al bucket si existe (solo deploy si el build ya corrió)
    const webOut = path.join(__dirname, '../../web/out');
    if (fs.existsSync(webOut)) {
      new s3deploy.BucketDeployment(this, 'WebDeployment', {
        sources: [s3deploy.Source.asset(webOut)],
        destinationBucket: siteBucket,
        distribution,
        distributionPaths: ['/*'],
        prune: true,
      });
    }

    new cdk.CfnOutput(this, 'TableName', { value: this.table.tableName });
    new cdk.CfnOutput(this, 'ApiUrl', { value: this.apiUrl });
    new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'WebUrl', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'WebBucketName', { value: siteBucket.bucketName });
  }
}
