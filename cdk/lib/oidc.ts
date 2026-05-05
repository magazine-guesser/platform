import { Construct } from 'constructs'
import { aws_iam as iam } from 'aws-cdk-lib'

interface GithubOidcProps {
  orgName: string
  cdkRepoName: string
  backendRepoName: string
  frontendRepoName: string
}

export class GithubOidc extends Construct {
  public readonly cdkRole: iam.Role
  public readonly backendRole: iam.Role
  public readonly frontendRole: iam.Role

  constructor(scope: Construct, id: string, props: GithubOidcProps) {
    super(scope, id)

    const provider = new iam.OpenIdConnectProvider(this, 'GithubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    })

    this.cdkRole = this.createRole('CdkRole', provider, props.orgName, props.cdkRepoName)
    this.cdkRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))

    this.backendRole = this.createRole(
      'BackendRole',
      provider,
      props.orgName,
      props.backendRepoName
    )

    this.backendRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess')
    )

    this.frontendRole = this.createRole(
      'FrontendRole',
      provider,
      props.orgName,
      props.frontendRepoName
    )
  }

  private createRole(
    id: string,
    provider: iam.OpenIdConnectProvider,
    orgName: string,
    repoName: string
  ) {
    return new iam.Role(this, id, {
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${orgName}/${repoName}:*`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
    })
  }
}
