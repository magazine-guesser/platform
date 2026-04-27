import * as cdk from 'aws-cdk-lib/core'
import { Template } from 'aws-cdk-lib/assertions'
import { AppStack } from '../../lib/app-stack'
import { aws_ec2 as ec2 } from 'aws-cdk-lib'

describe('AppStack', () => {
  let template: Template

  beforeEach(() => {
    const app = new cdk.App()

    /* dependency injection with mock vpc,
     * TODO: can be deleted once we pick a vpc and stop using from lookup
     */
    const vpcStack = new cdk.Stack(app, 'VpcStack')
    const mockVpc = ec2.Vpc.fromVpcAttributes(vpcStack, 'MockVpc', {
      vpcId: 'vpc-123',
      availabilityZones: ['eu-central-1a'],
      publicSubnetIds: ['subnets-123'],
    })

    const stack = new AppStack(app, 'TestAppStack', { vpc: mockVpc })
    template = Template.fromStack(stack)
  })
})
