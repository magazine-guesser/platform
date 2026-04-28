import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { DestroyAll } from './aspects'
import { EcsConstruct } from './app/ecs'
import { AlbConstruct } from './app/alb'
import { aws_ec2 as ec2, Aspects } from 'aws-cdk-lib'

interface AppStackProps extends cdk.StackProps {
  vpc?: ec2.IVpc
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AppStackProps) {
    super(scope, id, props)

    const vpc = props?.vpc ? props.vpc : ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true })

    const ecsConst = new EcsConstruct(this, 'EcsConstruct', { vpc })
    new AlbConstruct(this, 'AlbConstruct', {
      vpc,
      service: ecsConst.service,
      sg: ecsConst.sg,
    })

    Aspects.of(this).add(new DestroyAll())
  }
}
