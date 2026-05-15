import * as cdk from 'aws-cdk-lib/core'
import { Template, Match } from 'aws-cdk-lib/assertions'
import { InfraStack } from '../lib/infra-stack'
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

  // mock cert on a helper stack, mirrors CertStack in production
  const helperStack = new cdk.Stack(app, 'HelperStack')
  const mockCert = acm.Certificate.fromCertificateArn(
    helperStack,
    'MockCert',
    `arn:aws:acm:us-east-1:${ACCOUNT}:certificate/mock-cert-id`
  )

  const stack = new InfraStack(app, 'TestInfraStack', {
    env: { account: ACCOUNT, region: REGION },
    certificate: mockCert,
    domainName: DOMAIN,
    workerNames: ['scheduler', 'recycler'],
  })

  return Template.fromStack(stack)
}

describe('InfraStack: storage', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('DynamoDB table has correct partition and sort key', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'date', KeyType: 'HASH' },
        { AttributeName: 'nr', KeyType: 'RANGE' },
      ],
    })
  })

  test('S3 bucket blocks all public access', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    })
  })

  test('artifact bucket has correct fixed name', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'magazineguessr-artifacts',
    })
  })

  test('Secrets Manager secret is created for admin key', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'admin-key',
    })
  })
})

describe('InfraStack: regional certificate', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('regional ACM certificate covers the domain and wildcard', () => {
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: DOMAIN,
      SubjectAlternativeNames: [`*.${DOMAIN}`, `*.dev.${DOMAIN}`],
    })
  })
})

describe('InfraStack: CloudFront', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('CloudFront distribution serves index.html as default root', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultRootObject: 'index.html',
      },
    })
  })

  test('CloudFront redirects HTTP to HTTPS', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultCacheBehavior: {
          ViewerProtocolPolicy: 'redirect-to-https',
        },
      },
    })
  })

  test('CloudFront returns index.html on 403 for React Router support', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        CustomErrorResponses: [
          {
            ErrorCode: 403,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          },
          {
            ErrorCode: 404,
            ResponseCode: 200,
            ResponsePagePath: '/index.html',
          },
        ],
      },
    })
  })
})

describe('InfraStack: OIDC frontend role permissions', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('frontend role can list and read/write the S3 bucket', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['s3:GetObject*', 's3:GetBucket*', 's3:List*']),
            Effect: 'Allow',
          }),
        ]),
      },
    })
  })

  test('frontend role can create CloudFront invalidations', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'cloudfront:CreateInvalidation',
            Effect: 'Allow',
          }),
        ]),
      },
    })
  })
})

describe('InfraStack: OIDC backend role permissions', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('backend role has read/write access to the artifact bucket', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              's3:GetObject*',
              's3:PutObject',
              's3:PutObjectLegalHold',
              's3:PutObjectRetention',
              's3:PutObjectTagging',
              's3:PutObjectVersionTagging',
              's3:Abort*',
            ]),
            Effect: 'Allow',
          }),
        ]),
      },
    })
  })

  test('backend role has lambda deploy permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'lambda:UpdateFunctionCode',
              'lambda:GetFunctionConfiguration',
              'lambda:PublishVersion',
              'lambda:UpdateAlias',
            ]),
            Effect: 'Allow',
          }),
        ]),
      },
      Roles: Match.arrayWith([Match.objectLike({ Ref: Match.stringLikeRegexp('BackendRole') })]),
    })
  })
})

describe('InfraStack: OIDC workers role permissions', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('workers role can push to ECR', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['ecr:CompleteLayerUpload', 'ecr:PutImage']),
            Effect: 'Allow',
          }),
        ]),
      },
    })
  })

  test('workers role has lambda deploy permissions', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'lambda:UpdateFunctionCode',
              'lambda:GetFunctionConfiguration',
              'lambda:PublishVersion',
              'lambda:UpdateAlias',
            ]),
            Effect: 'Allow',
          }),
        ]),
      },
      Roles: Match.arrayWith([Match.objectLike({ Ref: Match.stringLikeRegexp('WorkersRole') })]),
    })
  })
})

describe('InfraStack: ECR workers repo', () => {
  let template: Template
  beforeEach(() => {
    template = buildTemplate()
  })

  test('ECR repository is created with correct name', () => {
    template.hasResourceProperties('AWS::ECR::Repository', {
      RepositoryName: 'magazineguessr-workers',
    })
  })
})
