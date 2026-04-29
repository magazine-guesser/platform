import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { GithubOidc } from './oidc'
import { DestroyAll } from './aspects'
import { CloudFrontConstruct } from './infra/cloudfront'
import {
  aws_s3 as s3,
  aws_secretsmanager as sm,
  aws_dynamodb as dynamodb,
  aws_route53 as route53,
  aws_certificatemanager as acm,
  Aspects,
} from 'aws-cdk-lib'

interface InfraStackProps extends cdk.StackProps {
  certificate: acm.ICertificate
  domainName: string
}

export class InfraStack extends cdk.Stack {
  public readonly regionalCert: acm.Certificate
  public readonly hostedZone: route53.IHostedZone
  public readonly magazineTable: dynamodb.Table
  public readonly adminKey: sm.Secret

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props)

    this.hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: 'magazineguessr.com',
    })

    this.regionalCert = new acm.Certificate(this, 'RegionalCert', {
      domainName: 'magazineguessr.com',
      subjectAlternativeNames: ['*.magazineguessr.com'],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    })

    this.adminKey = new sm.Secret(this, 'AdminSecret', {
      secretName: 'admin-key',
      description: 'allows backend admin access through frontend',
      generateSecretString: {
        excludePunctuation: true,
      },
    })

    this.magazineTable = new dynamodb.Table(this, 'DailySelection', {
      tableName: 'magazines-daily',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'nr', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    })

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
    })

    const cfConst = new CloudFrontConstruct(this, 'CloudFrontConstruct', {
      domainName: 'magazineguessr.com',
      frontendBucket: frontendBucket,
      certificate: props.certificate,
    })

    new GithubOidc(this, 'GithubOicd', {
      orgName: 'magazine-guesser',
      cdkRepoName: 'platform',
      backendRepoName: 'backend',
      frontendBucket,
      frontendRepoName: 'frontend',
      distribution: cfConst.distribution,
    })

    Aspects.of(this).add(new DestroyAll())
  }
}
