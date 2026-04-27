import { Construct } from 'constructs'
import {
  aws_ecs as ecs,
  aws_ec2 as ec2,
  aws_ecr as ecr,
  aws_secretsmanager as sm,
} from 'aws-cdk-lib'

interface EcsProps {
  vpc: ec2.IVpc
}

export class EcsConstruct extends Construct {
  public readonly service: ecs.FargateService
  public readonly sg: ec2.SecurityGroup

  constructor(scope: Construct, id: string, props: EcsProps) {
    super(scope, id)

    const repo = ecr.Repository.fromRepositoryName(this, 'BackendImages', 'backend-images')
    const cluster = new ecs.Cluster(this, 'Cluster', { vpc: props.vpc })

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    })

    const adminSecret = sm.Secret.fromSecretNameV2(this, 'AdminSecret', 'admin-key')
    taskDef.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'backend' }),
      secrets: {
        ADMIN_KEY: ecs.Secret.fromSecretsManager(adminSecret),
      },
    })

    this.sg = new ec2.SecurityGroup(this, 'TaskSg', { vpc: props.vpc })

    this.service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      securityGroups: [this.sg],
      assignPublicIp: true,
    })
  }
}
