import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { aws_ecr as ecr, aws_s3 as s3, aws_secretsmanager as sm, Aspects } from 'aws-cdk-lib';
import { GithubOidc } from './oidc';
import { DestroyAll } from './aspects';

export class InfraStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const adminSecret = new sm.Secret(this, 'AdminSecret', {
            secretName: 'admin-key',
            description: 'allows backend admin access through frontend',
            generateSecretString: {
                excludePunctuation: true
            }
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

        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
        });

        const oicd = new GithubOidc(this, 'GithubOicd', {
            ecrRepo: containerRepo,
            orgName: 'magazine-guesser',
            cdkRepoName: 'platform',
            backendRepoName: 'backend',
            frontendBucket,
            frontendRepoName: 'frontend'
        })

        Aspects.of(this).add(new DestroyAll());
    }
}
