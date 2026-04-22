import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { aws_dynamodb as dynamodb, aws_ec2 as ec2, Aspects } from 'aws-cdk-lib';
import { DestroyAll } from './app/aspects';
import { EcsConstruct } from './app/ecs'
import { AlbConstruct } from './app/alb';

export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const dailyTable = new dynamodb.Table(this, 'DailySelection', {
            partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'nr', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        });

        const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true });

        const ecsConst = new EcsConstruct(this, 'EcsConstruct', { vpc });
        const albConst = new AlbConstruct(this, 'AlbConstruct', {
            vpc,
            service: ecsConst.service,
            sg: ecsConst.sg
        })

        Aspects.of(this).add(new DestroyAll());
    }
}