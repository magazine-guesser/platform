import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { aws_ecr as ecr, aws_s3 as s3 } from 'aws-cdk-lib';
import { GithubOidc } from './oidc';
import { BlockPublicAccess } from 'aws-cdk-lib/aws-s3';

export class InfraStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const containerRepo = new ecr.Repository(this, 'BackendImages', {
            repositoryName: 'backend-images',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            emptyOnDelete: true,
            lifecycleRules: [{
                maxImageCount: 3,
                description: 'keep last 3 images'
            }]
        });

        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const oicd = new GithubOidc(this, 'GithubOicd', {
            ecrRepo: containerRepo,
            orgName: 'magazine-guesser',
            cdkRepoName: 'platform',
            backendRepoName: 'backend',
            frontendBucket,
            frontendRepoName: 'frontend'
        })

    }
}
