#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core'
import { AppStack } from '../lib/app-stack'
import { InfraStack } from '../lib/infra-stack'
import { CertStack } from '../lib/cert-stack'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
}

const certstack = new CertStack(app, 'CertStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  domainName: 'magazineguessr.com'
})

new InfraStack(app, 'InfraStack', {
  env,
  certificate: certstack.certificate
})

new AppStack(app, 'AppStack', { env })