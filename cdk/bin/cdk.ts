#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core'
import { AppStack } from '../lib/app-stack'
import { InfraStack } from '../lib/infra-stack'
import { aws_ec2 as ec2 } from 'aws-cdk-lib'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
}

new AppStack(app, 'AppStack', { env })
new InfraStack(app, 'InfraStack', { env })
