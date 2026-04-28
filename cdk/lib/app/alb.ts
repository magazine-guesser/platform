import { Construct } from 'constructs'
import {
  aws_elasticloadbalancingv2 as elbv2,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_certificatemanager as acm,
  Duration,
} from 'aws-cdk-lib'

interface AlbProps {
  vpc: ec2.IVpc
  service: ecs.FargateService
  sg: ec2.SecurityGroup
  certificate: acm.ICertificate
}

export class AlbConstruct extends Construct {
  public readonly alb: elbv2.ApplicationLoadBalancer

  constructor(scope: Construct, id: string, props: AlbProps) {
    super(scope, id)

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc: props.vpc,
      internetFacing: true,
    })

    alb.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true
      })
    })

    const listener = alb.addListener('HttpsListener', {
      port: 443,
      open: true,
      certificates: [props.certificate]
    })

    listener.addTargets('EcsTargets', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [props.service],
      healthCheck: {
        path: '/health',
        interval: Duration.seconds(30),
      },
    })

    this.alb = alb

    props.sg.addIngressRule(
      ec2.Peer.securityGroupId(alb.connections.securityGroups[0].securityGroupId),
      ec2.Port.tcp(3000)
    )
  }
}
