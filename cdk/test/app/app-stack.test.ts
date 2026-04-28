import * as cdk from 'aws-cdk-lib/core'
import { Template } from 'aws-cdk-lib/assertions'
import { AppStack } from '../../lib/app-stack'
import { aws_ec2 as ec2, aws_certificatemanager as acm } from 'aws-cdk-lib'

const ACCOUNT = '123456789012'
const REGION = 'eu-central-1'
const DOMAIN = 'magazineguessr.com'

const hostedZoneContext = {
  [`hosted-zone:account=${ACCOUNT}:domainName=${DOMAIN}:region=${REGION}`]: {
    Id: '/hostedzone/TESTZONEID',
    Name: `${DOMAIN}.`,
  },
}

describe('AppStack', () => {
  let template: Template

  beforeEach(() => {
    const app = new cdk.App({ context: hostedZoneContext })

    /* dependency injection with mock vpc,
     * TODO: can be deleted once we pick a vpc and stop using from lookup
     */
    const vpcStack = new cdk.Stack(app, 'VpcStack')
    const mockVpc = ec2.Vpc.fromVpcAttributes(vpcStack, 'MockVpc', {
      vpcId: 'vpc-123',
      availabilityZones: ['eu-central-1a'],
      publicSubnetIds: ['subnets-123'],
    })

    const helperStack = new cdk.Stack(app, 'HelperStack')
    const mockCert = acm.Certificate.fromCertificateArn(
      helperStack,
      'MockCert',
      `arn:aws:acm:us-east-1:${ACCOUNT}:certificate/mock-cert-id`
    )

    const stack = new AppStack(app, 'TestAppStack', {
      env: { account: ACCOUNT, region: REGION },
      vpc: mockVpc,
      certificate: mockCert,
    })
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

  test('ALB HTTPS listener is on port 443', () => {
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 443,
    })
  })

  test('Container has TABLE_NAME env var set', () => {
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          Environment: [{ Name: 'TABLE_NAME', Value: 'magazines-daily' }],
        },
      ],
    })
  })

  test('Route 53 A record is created for api subdomain', () => {
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: 'api.magazineguessr.com.',
      Type: 'A',
    })
  })
})
