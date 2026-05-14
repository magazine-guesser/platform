import { Construct } from 'constructs'
import { aws_lambda as lambda, aws_dynamodb as dynamodb, aws_ecr as ecr } from 'aws-cdk-lib'

interface WorkerLambdasProps {
  workerNames: string[]
  magazinesDailyTable: dynamodb.ITable
  magazinesPoolTable: dynamodb.ITable
  imageRepo: ecr.IRepository
}

export class WorkerLambdas extends Construct {
  public readonly functions: lambda.Function[]

  constructor(scope: Construct, id: string, props: WorkerLambdasProps) {
    super(scope, id)

    this.functions = []

    props.workerNames.forEach((name) => {
      this.functions.push(
        new lambda.Function(
          this,
          `${name.charAt(0).toUpperCase()}${name.slice(1)}`, // First letter uppercase
          {
            functionName: `magazineguessr-${name}`,
            runtime: lambda.Runtime.FROM_IMAGE,
            handler: lambda.Handler.FROM_IMAGE,
            code: lambda.Code.fromEcrImage(props.imageRepo, { tagOrDigest: `${name}-latest` }),
            environment: {
              DAILY_TABLE_NAME: props.magazinesDailyTable.tableName,
              POOL_TABLE_NAME: props.magazinesPoolTable.tableName,
            },
          }
        )
      )
    })

    //give all permissions on the tables
    this.functions.forEach((lambdaFn) => {
      props.magazinesDailyTable.grantReadWriteData(lambdaFn)
      props.magazinesPoolTable.grantReadWriteData(lambdaFn)
    })
  }
}
