import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class YafaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC with private subnets and VPC endpoints for cost optimization
    const vpc = new ec2.Vpc(this, 'YafaVpc', {
      maxAzs: 2,
      natGateways: 0, // Use VPC endpoints instead
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // VPC Endpoints for cost optimization (avoid NAT Gateway charges)
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    const vpcEndpoints = [
      'ecr.dkr', 'ecr.api', 'logs', 'secretsmanager', 'sts'
    ];
    
    vpcEndpoints.forEach(service => {
      vpc.addInterfaceEndpoint(`${service}Endpoint`, {
        service: new ec2.InterfaceVpcEndpointAwsService(service),
        privateDnsEnabled: true,
      });
    });

    // ECR Repository
    const repository = new ecr.Repository(this, 'YafaRepository', {
      repositoryName: 'yafa-ms',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageTagMutability: ecr.TagMutability.MUTABLE,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'YafaCluster', {
      vpc,
      clusterName: 'yafa-cluster',
      containerInsights: true,
    });

    // Task Role with least-privilege access to Secrets Manager
    const taskRole = new iam.Role(this, 'YafaTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant read access to the specific LLM secret
    const llmSecret = secretsmanager.Secret.fromSecretNameV2(this, 'LlmSecret', 'yafa/ms/llm/openai/api_key');
    llmSecret.grantRead(taskRole);

    // Log Group
    const logGroup = new logs.LogGroup(this, 'YafaLogGroup', {
      logGroupName: '/ecs/yafa-ms',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'YafaTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole,
      executionRole: taskRole,
    });

    const container = taskDefinition.addContainer('YafaContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'yafa-ms',
        logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '8787',
      },
      secrets: {
        OPENAI_API_KEY: ecs.Secret.fromSecretsManager(llmSecret),
      },
    });

    container.addPortMappings({
      containerPort: 8787,
      protocol: ecs.Protocol.TCP,
    });

    // ALB Security Group
    const albSg = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      description: 'ALB Security Group',
      allowAllOutbound: false,
    });

    albSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );

    albSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, 'YafaALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    // ECS Service
    const service = new ecs.FargateService(this, 'YafaService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [
        new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
          vpc,
          description: 'ECS Service Security Group',
          allowAllOutbound: true,
        }),
      ],
    });

    // Allow ALB to reach ECS service
    service.connections.allowFrom(alb, ec2.Port.tcp(8787));

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'YafaTargetGroup', {
      vpc,
      port: 8787,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    // ALB Listener
    alb.addListener('YafaListener', {
      port: 80,
      defaultTargetGroups: [targetGroup],
    });

    // S3 Bucket for web app
    const webBucket = new s3.Bucket(this, 'YafaWebBucket', {
      bucketName: `yafa-ms-web-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'YafaDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.LoadBalancerV2Origin(alb, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Cognito User Pool for private access
    const userPool = new cognito.UserPool(this, 'YafaUserPool', {
      userPoolName: 'yafa-ms-users',
      selfSignUpEnabled: false, // Admin-only creation
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'YafaUserPoolClient', {
      userPool,
      userPoolClientName: 'yafa-ms-client',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'API Load Balancer URL',
    });

    new cdk.CfnOutput(this, 'WebUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Web URL',
    });

    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}
