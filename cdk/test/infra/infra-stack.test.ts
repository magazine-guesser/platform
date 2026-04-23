import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../../lib/infra-stack';

describe('InfraStack', () => {
    let template: Template;

    beforeEach(() => {
        const app = new cdk.App();
        const stack = new InfraStack(app, 'TestInfraStack');
        template = Template.fromStack(stack);
    });

    test('ECR repository is created with the correct name', () => {
        template.hasResourceProperties('AWS::ECR::Repository', {
            RepositoryName: 'backend-images'
        });
    });
});
