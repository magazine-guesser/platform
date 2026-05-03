import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { DestroyAll } from './aspects'
import { LambdaConstruct } from './app/lambda'
import { GatewayConstruct } from './app/gateway'
import {
  aws_certificatemanager as acm,
  aws_secretsmanager as sm,
  aws_route53 as route53,
  aws_route53_targets as targets,
  aws_dynamodb as dynamodb,
  aws_s3 as s3,
  Aspects,
} from 'aws-cdk-lib'

interface AppStackProps extends cdk.StackProps {
  adminKey: sm.ISecret
  magazinesDailyTable: dynamodb.ITable
  magazinesPoolTable: dynamodb.ITable
  certificate: acm.ICertificate
  hostedZone: route53.IHostedZone
  domainName: string
  artifactBucket: s3.IBucket
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props)

    const lambdaConstruct = new LambdaConstruct(this, 'LambdaConstruct', {
      magazinesDailyTable: props.magazinesDailyTable,
      magazinesPoolTable: props.magazinesPoolTable,
      adminKey: props.adminKey,
      artifactBucket: props.artifactBucket,
    })

    const gatewayConstruct = new GatewayConstruct(this, 'GatewayConstruct', {
      devAlias: lambdaConstruct.devAlias,
      prodAlias: lambdaConstruct.prodAlias,
      certificate: props.certificate,
      domainName: props.domainName,
    })

    new route53.ARecord(this, 'ProdApiRecord', {
      zone: props.hostedZone,
      recordName: 'api',
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          gatewayConstruct.prodDomain.regionalDomainName,
          gatewayConstruct.prodDomain.regionalHostedZoneId
        )
      ),
    })

    new route53.ARecord(this, 'DevApiRecord', {
      zone: props.hostedZone,
      recordName: 'api.dev',
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayv2DomainProperties(
          gatewayConstruct.devDomain.regionalDomainName,
          gatewayConstruct.devDomain.regionalHostedZoneId
        )
      ),
    })

    Aspects.of(this).add(new DestroyAll())
  }
}
