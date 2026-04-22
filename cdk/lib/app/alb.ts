import { Construct } from 'constructs';
import { aws_elasticloadbalancingv2 as elbv2, aws_ec2 as ec2 } from 'aws-cdk-lib'

interface AlbProps {
    vpc: ec2.IVpc,
}

export class AlbConstruct extends Construct {

    constructor(scope: Construct, id: string, props: AlbProps) {
        super(scope, id);

        const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
            vpc: props.vpc,
            internetFacing: true
        });
    }
}