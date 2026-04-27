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

  test('Fargate task definition has correct memory and cpu', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Memory: '512',
      Cpu: '256',
    })
  })

  test('Container exposes port 3000', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          PortMappings: [{ ContainerPort: 3000 }],
        },
      ],
    })
  })

  test('ALB is internet facing', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      Scheme: 'internet-facing',
    })
  })

  test('ALB listener is on port 80', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 80,
    })
  })
})
