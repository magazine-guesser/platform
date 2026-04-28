import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { DestroyAll } from './aspects'
import { EcsConstruct } from './app/ecs'
import { AlbConstruct } from './app/alb'
import {
  aws_ec2 as ec2,
  aws_certificatemanager as acm,
  aws_route53 as route53,
  aws_route53_targets as targets,
  Aspects
} from 'aws-cdk-lib'

interface AppStackProps extends cdk.StackProps {
  vpc?: ec2.IVpc,
  certificate: acm.ICertificate
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AppStackProps) {
    super(scope, id, props)

    const vpc = props?.vpc ? props.vpc : ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true })

    const ecsConst = new EcsConstruct(this, 'EcsConstruct', { vpc })
    const albConst = new AlbConstruct(this, 'AlbConstruct', {
      vpc,
      service: ecsConst.service,
      sg: ecsConst.sg,
    })

    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: 'magazineguessr.com',
    })

    new route53.ARecord(this, 'ApiRecord', {
      zone: hostedZone,
      recordName: 'api',
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(albConst.alb)
      )
    })

    Aspects.of(this).add(new DestroyAll())
  }
}