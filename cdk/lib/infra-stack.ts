import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { GithubOidc } from './oidc'
import { DestroyAll } from './aspects'
import { CloudFrontConstruct } from './infra/cloudfront'
import {
  aws_ecr as ecr,
  aws_s3 as s3,
  aws_secretsmanager as sm,
  aws_dynamodb as dynamodb,
  aws_certificatemanager as acm,
  Aspects,
} from 'aws-cdk-lib'

interface InfraStackProps extends cdk.StackProps {
  certificate: acm.ICertificate
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props)

    new sm.Secret(this, 'AdminSecret', {
      secretName: 'admin-key',
      description: 'allows backend admin access through frontend',
      generateSecretString: {
        excludePunctuation: true,
      },
    })

    new dynamodb.Table(this, 'DailySelection', {
      tableName: 'magazines-daily',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'nr', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    })

    const containerRepo = new ecr.Repository(this, 'BackendImages', {
      repositoryName: 'backend-images',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [
        {
          maxImageCount: 3,
          description: 'keep last 3 images',
        },
      ],
    })

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
    })

    new CloudFrontConstruct(this, 'CloudFrontConstruct', {
      domainName: 'magazineguessr.com',
      frontendBucket: frontendBucket,
      certificate: props.certificate,
    })

    new GithubOidc(this, 'GithubOicd', {
      ecrRepo: containerRepo,
      orgName: 'magazine-guesser',
      cdkRepoName: 'platform',
      backendRepoName: 'backend',
      frontendBucket,
      frontendRepoName: 'frontend',
    })

    Aspects.of(this).add(new DestroyAll())
  }
}
