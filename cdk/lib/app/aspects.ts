import { IAspect, RemovalPolicy, CfnResource } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

export class DestroyAll implements IAspect {
    visit(node: IConstruct) {
        if( node instanceof CfnResource ){
            node.applyRemovalPolicy(RemovalPolicy.DESTROY);
        }
    }
}