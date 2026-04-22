import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { aws_dynamodb as dynamodb, aws_ecs as ecs, aws_ec2 as ec2, aws_ecr as ecr, Aspects } from 'aws-cdk-lib';
import { DestroyAll } from './aspects';

export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const repo = ecr.Repository.fromRepositoryName(this, 'BackendImages', 'backend-images');

        const dailyTable = new dynamodb.Table(this, 'DailySelection', {
            partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'nr', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });

        const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true });
        const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

        const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
            memoryLimitMiB: 512,
            cpu: 256
        });

        taskDef.addContainer('BackendContainer', {
            image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
            portMappings: [{ containerPort: 3000 }]
        });

        const sg = new ec2.SecurityGroup(this, 'TaskSg', { vpc });
        sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000)); //TODO: restrict once ALB is set up

        Aspects.of(this).add(new DestroyAll());
        new cdk.CfnOutput(this, 'ClusterName', { value: cluster.clusterName });
        new cdk.CfnOutput(this, 'TaskDefArn', { value: taskDef.taskDefinitionArn });
        new cdk.CfnOutput(this, 'SecurityGroupId', { value: sg.securityGroupId });
    }
}