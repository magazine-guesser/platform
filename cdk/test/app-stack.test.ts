import * as cdk from 'aws-cdk-lib/core'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { AppStack } from '../lib/app-stack'
import { aws_certificatemanager as acm } from 'aws-cdk-lib'

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
    `arn:aws:acm:us-east-1:${ACCOUNT}:certificate/mock-cert-id`
  )

  const stack = new AppStack(app, 'TestAppStack', {
    env: { account: ACCOUNT, region: REGION },
    certificate: mockCert,
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

  test('Lambda function has TABLE_NAME env var set', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          TABLE_NAME: 'magazines-daily',
        }),
      },
    })
  })

  test('Lambda function has explicit name', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'magazineguessr-backend',
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
