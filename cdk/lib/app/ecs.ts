import { Construct } from 'constructs';
import { aws_ecs as ecs, aws_ec2 as ec2, aws_ecr as ecr } from 'aws-cdk-lib'

interface EcsProps {
    vpc: ec2.IVpc,
}

export class EcsConstruct extends Construct {

    public readonly service: ecs.FargateService;
    public readonly sg: ec2.SecurityGroup

    constructor(scope: Construct, id: string, props: EcsProps) {
        super(scope, id);

        const repo = ecr.Repository.fromRepositoryName(this, 'BackendImages', 'backend-images');
        const cluster = new ecs.Cluster(this, 'Cluster', { vpc: props.vpc });

        const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
            memoryLimitMiB: 512,
            cpu: 256
        });

        taskDef.addContainer('BackendContainer', {
            image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
            portMappings: [{ containerPort: 3000 }],
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'backend' })
        });

        this.sg = new ec2.SecurityGroup(this, 'TaskSg', { vpc: props.vpc });
        this.sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000)); //TODO: restrict once ALB is set up

        this.service = new ecs.FargateService(this, 'Service', {
            cluster,
            taskDefinition: taskDef,
            desiredCount: 1,
            securityGroups: [this.sg],
            assignPublicIp: true
        });
    }
}