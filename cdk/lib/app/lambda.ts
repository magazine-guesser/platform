import { Construct } from 'constructs'
import {
  aws_lambda as lambda,
  aws_dynamodb as dynamodb,
  aws_secretsmanager as sm,
} from 'aws-cdk-lib'

interface LambdaProps {
  table: dynamodb.ITable
  adminSecret: sm.ISecret
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
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200 })'),
      environment: {
        TABLE_NAME: 'magazines-daily',
      },
    })

    props.table.grantReadData(this.fn)
    props.adminSecret.grantRead(this.fn)

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
