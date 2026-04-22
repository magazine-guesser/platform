import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { aws_ecr as ecr } from 'aws-cdk-lib';
import { GithubOidc } from './oidc';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dailyTable = new dynamodb.Table(this, 'DailySelection', {
      partitionKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'nr', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const containerRepo = new ecr.Repository(this, 'BackendImages', {
      repositoryName: 'backend-images',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [{
        maxImageCount: 3,
        description: 'keep last 3 images'
      }]
    });

    const oicd = new GithubOidc(this, 'GithubOicd', {
      ecrRepo: containerRepo,
      orgName: 'magazine-guesser',
      cdkRepoName: 'platform',
      backendRepoName: 'backend'
    })

  }
}
