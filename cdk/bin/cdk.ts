#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core'
import { AppStack } from '../lib/app-stack'
import { InfraStack } from '../lib/infra-stack'
import { CertStack } from '../lib/cert-stack'

const app = new cdk.App()
const domainName = 'magazineguessr.com'

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
}

const certstack = new CertStack(app, 'CertStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  domainName,
})

const infrastack = new InfraStack(app, 'InfraStack', {
  env,
  domainName,
  certificate: certstack.certificate,
  crossRegionReferences: true,
})

new AppStack(app, 'AppStack', {
  env,
  domainName,
  adminKey: infrastack.adminKey,
  magazinesDailyTable: infrastack.magazinesDailyTable,
  magazinesPoolTable: infrastack.magazinesPoolTable,
  hostedZone: infrastack.hostedZone,
  certificate: infrastack.regionalCert,
  artifactBucket: infrastack.artifactBucket,
  crossRegionReferences: true,
  imageRepo: infrastack.imageRepo,
})
