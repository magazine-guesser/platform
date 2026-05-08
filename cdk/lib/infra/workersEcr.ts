import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import { aws_ecr as ecr } from 'aws-cdk-lib'

interface WorkersEcrProps {
  tagPrefixes: string[]
}

export class WorkersEcrConstruct extends Construct {
  public readonly repo: ecr.Repository

  constructor(scope: Construct, id: string, props: WorkersEcrProps) {
    super(scope, id)

    this.repo = new ecr.Repository(this, 'Repo', {
      repositoryName: 'magazineguessr-workers',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [
        {
          description: 'Remove untagged images after 1 day',
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageAge: cdk.Duration.days(1),
          rulePriority: 1,
        },
      ],
    })

    props.tagPrefixes.forEach((prefix, i) => {
      this.repo.addLifecycleRule({
        description: `Keep last 3 ${prefix} images`,
        tagPrefixList: [prefix],
        maxImageCount: 3,
        rulePriority: i + 2,
      })
    })
  }
}
