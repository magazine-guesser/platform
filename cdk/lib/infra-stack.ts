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
  public readonly magazinesDailyTable: dynamodb.Table
  public readonly magazinesPoolTable: dynamodb.Table
  public readonly adminKey: sm.Secret
  public readonly artifactBucket: s3.Bucket

  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props)

    this.hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.domainName,
    })

    this.regionalCert = new acm.Certificate(this, 'RegionalCert', {
      domainName: props.domainName,
      subjectAlternativeNames: [`*.${props.domainName}`, `*.dev.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    })

    this.adminKey = new sm.Secret(this, 'AdminSecret', {
      secretName: 'admin-key',
      description: 'allows backend admin access through frontend',
      generateSecretString: {
        excludePunctuation: true,
      },
    })

    this.magazinesDailyTable = new dynamodb.Table(this, 'DailySelection', {
      tableName: 'magazines-daily',
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'nr', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    })

    this.magazinesPoolTable = new dynamodb.Table(this, 'MagazinesPool', {
      tableName: 'magazines-pool',
      partitionKey: { name: 'identifier', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'uuid', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    })

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      autoDeleteObjects: true,
    })

    this.artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      bucketName: 'magazineguessr-artifacts',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    const cfConst = new CloudFrontConstruct(this, 'CloudFrontConstruct', {
      domainName: props.domainName,
      frontendBucket: frontendBucket,
      certificate: props.certificate,
    })

    const oidc = new GithubOidc(this, 'GithubOicd', {
      orgName: 'magazine-guesser',
      cdkRepoName: 'platform',
      backendRepoName: 'backend',
      frontendRepoName: 'frontend',
    })

    frontendBucket.grantReadWrite(oidc.frontendRole)
    cfConst.distribution.grantCreateInvalidation(oidc.frontendRole)
    this.artifactBucket.grantReadWrite(oidc.backendRole)

    Aspects.of(this).add(new DestroyAll())
  }
}
