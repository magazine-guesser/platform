import { Construct } from 'constructs'
import {
  aws_lambda as lambda,
  aws_dynamodb as dynamodb,
  aws_secretsmanager as sm,
  aws_s3 as s3,
} from 'aws-cdk-lib'

interface LambdaProps {
  magazinesDailyTable: dynamodb.ITable
  magazinesPoolTable: dynamodb.ITable
  adminKey: sm.ISecret
  artifactBucket: s3.IBucket
}

export class LambdaConstruct extends Construct {
  public readonly fn: lambda.Function
  public readonly devAlias: lambda.Alias
  public readonly prodAlias: lambda.Alias

  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id)

    this.fn = new lambda.Function(this, 'Function', {
      functionName: 'magazineguessr-backend',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromBucket(props.artifactBucket, 'backend/latest.zip'),
      environment: {
        DAILY_TABLE_NAME: props.magazinesDailyTable.tableName,
        POOL_TABLE_NAME: props.magazinesPoolTable.tableName,
      },
    })

    props.magazinesDailyTable.grantReadData(this.fn)
    props.magazinesPoolTable.grantReadWriteData(this.fn)
    props.adminKey.grantRead(this.fn)

    this.devAlias = new lambda.Alias(this, 'DevAlias', {
      aliasName: 'dev',
      version: this.fn.latestVersion,
    })

    this.prodAlias = new lambda.Alias(this, 'ProdAlias', {
      aliasName: 'prod',
      version: this.fn.currentVersion,
    })
  }
}
