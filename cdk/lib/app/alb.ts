import { Construct } from 'constructs';
import { aws_elasticloadbalancingv2 as elbv2, aws_ec2 as ec2, aws_ecs as ecs, Duration } from 'aws-cdk-lib'

interface AlbProps {
    vpc: ec2.IVpc,
    service: ecs.FargateService,
    sg: ec2.SecurityGroup
}

export class AlbConstruct extends Construct {

    constructor(scope: Construct, id: string, props: AlbProps) {
        super(scope, id);

        const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
            vpc: props.vpc,
            internetFacing: true
        });

        const listener = alb.addListener('Listener', {
            port: 80,
            open: true
        });

        listener.addTargets('EcsTargets', {
            port: 3000,
            targets: [props.service],
            healthCheck: {
                path: '/health',
                interval: Duration.seconds(30)
            }
        });

        props.sg.addIngressRule(
            ec2.Peer.securityGroupId(alb.connections.securityGroups[0].securityGroupId),
            ec2.Port.tcp(3000)
        );
    }
}