import * as cdk from 'aws-cdk-lib/core'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { AppStack } from '../lib/app-stack'
import {
  aws_certificatemanager as acm,
  aws_route53 as route53,
  aws_dynamodb as dynamodb,
  aws_secretsmanager as sm,
  aws_s3 as s3,
} from 'aws-cdk-lib'

const ACCOUNT = '123456789012'
const REGION = 'eu-central-1'
const DOMAIN = 'magazineguessr.com'

const hostedZoneContext = {
  [`hosted-zone:account=${ACCOUNT}:domainName=${DOMAIN}:region=${REGION}`]: {
    Id: '/hostedzone/TESTZONEID',
    Name: `${DOMAIN}.`,
  },
}

const buildTemplate = () => {
  const app = new cdk.App({ context: hostedZoneContext })

  const helperStack = new cdk.Stack(app, 'HelperStack')
  const mockCert = acm.Certificate.fromCertificateArn(
    helperStack,
    'MockCert',
    `arn:aws:acm:eu-central-1:${ACCOUNT}:certificate/mock-cert-id`
  )
  const mockHostedZone = route53.HostedZone.fromHostedZoneAttributes(helperStack, 'MockZone', {
    hostedZoneId: 'TESTZONEID',
    zoneName: DOMAIN,
  })
  const mockDailyTable = dynamodb.Table.fromTableName(helperStack, 'MockDailyTable', 'magazines-daily')
  const mockPoolTable = dynamodb.Table.fromTableName(helperStack, 'MockPoolTable', 'magazines-pool')
  const mockSecret = sm.Secret.fromSecretNameV2(helperStack, 'MockSecret', 'admin-key')
  const mockArtifactBucket = s3.Bucket.fromBucketName(
    helperStack,
    'MockArtifactBucket',
    'magazineguessr-artifacts'
  )

  const stack = new AppStack(app, 'TestAppStack', {
    env: { account: ACCOUNT, region: REGION },
    certificate: mockCert,
    hostedZone: mockHostedZone,
    domainName: DOMAIN,
    magazinesDailyTable: mockDailyTable,
    magazinesPoolTable: mockPoolTable,
    adminKey: mockSecret,
    artifactBucket: mockArtifactBucket,
  })

  return Template.fromStack(stack)
}

describe('AppStack: Lambda', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('Lambda function uses Node.js 22 runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
    })
  })

  test('Lambda function has correct handler', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'lambda.handler',
    })
  })

  test('Lambda function has correct table env vars set', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          DAILY_TABLE_NAME: 'magazines-daily',
          POOL_TABLE_NAME: 'magazines-pool',
        }),
      },
    })
  })

  test('Lambda function has explicit name', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'magazineguessr-backend',
    })
  })

  test('Lambda function code is loaded from S3 artifact bucket', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: 'magazineguessr-artifacts',
        S3Key: 'backend/latest.zip',
      },
    })
  })

  test('dev and prod aliases are created', () => {
    template.hasResourceProperties('AWS::Lambda::Alias', { Name: 'dev' })
    template.hasResourceProperties('AWS::Lambda::Alias', { Name: 'prod' })
  })
})

describe('AppStack: API Gateway', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('two HTTP APIs are created', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 2)
  })

  test('prod and dev custom domains are created', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::DomainName', {
      DomainName: 'api.magazineguessr.com',
    })
    template.hasResourceProperties('AWS::ApiGatewayV2::DomainName', {
      DomainName: 'api.dev.magazineguessr.com',
    })
  })

  test('both domains have API mappings', () => {
    template.resourceCountIs('AWS::ApiGatewayV2::ApiMapping', 2)
  })
})

describe('AppStack: Route53', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('A record is created for prod API', () => {
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'api.magazineguessr.com.',
      Type: 'A',
    })
  })

  test('A record is created for dev API', () => {
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'api.dev.magazineguessr.com.',
      Type: 'A',
    })
  })
})
