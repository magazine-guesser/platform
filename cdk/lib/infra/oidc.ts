import { Construct } from 'constructs'
import { aws_iam as iam } from 'aws-cdk-lib'

interface GithubOidcProps {
  orgName: string
  cdkRepoName: string
  backendRepoName: string
  frontendRepoName: string
  workersRepoName: string
}

export class GithubOidc extends Construct {
  public readonly cdkRole: iam.Role
  public readonly backendRole: iam.Role
  public readonly frontendRole: iam.Role
  public readonly workersRole: iam.Role

  private readonly provider: iam.IOpenIdConnectProvider
  private readonly orgName: string

  constructor(scope: Construct, id: string, props: GithubOidcProps) {
    super(scope, id)

    this.provider = new iam.OpenIdConnectProvider(this, 'GithubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    })
    this.orgName = props.orgName

    this.cdkRole = this.createRole('CdkRole', 'mg-github-cdk', props.cdkRepoName)
    this.frontendRole = this.createRole(
      'FrontendRole',
      'mg-github-frontend',
      props.frontendRepoName
    )
    this.workersRole = this.createRole('WorkersRole', 'mg-github-workers', props.workersRepoName)
    this.backendRole = this.createRole('BackendRole', 'mg-github-backend', props.backendRepoName)

    this.cdkRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))
  }

  private createRole(id: string, roleName: string, repoName: string) {
    return new iam.Role(this, id, {
      roleName,
      assumedBy: new iam.WebIdentityPrincipal(this.provider.openIdConnectProviderArn, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${this.orgName}/${repoName}:*`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
    })
  }
}
