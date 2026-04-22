import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';

export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const dailyTable = new dynamodb.Table(this, 'DailySelection', {
            partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'nr', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

    }
}