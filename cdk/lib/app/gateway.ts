import { Construct } from 'constructs'
import {
  aws_apigatewayv2 as apigwv2,
  aws_apigatewayv2_integrations as integrations,
  aws_certificatemanager as acm,
  aws_lambda as lambda,
} from 'aws-cdk-lib'

interface GatewayProps {
  devAlias: lambda.IAlias
  prodAlias: lambda.IAlias
  certificate: acm.ICertificate
  domainName: string
}

export class GatewayConstruct extends Construct {
  public readonly prodDomain: apigwv2.DomainName
  public readonly devDomain: apigwv2.DomainName

  constructor(scope: Construct, id: string, props: GatewayProps) {
    super(scope, id)

    const prodApi = new apigwv2.HttpApi(this, 'ProdApi', {
      defaultIntegration: new integrations.HttpLambdaIntegration(
        'ProdIntegration',
        props.prodAlias
      ),
    })

    const devApi = new apigwv2.HttpApi(this, 'DevApi', {
      defaultIntegration: new integrations.HttpLambdaIntegration('DevIntegration', props.devAlias),
    })

    this.prodDomain = new apigwv2.DomainName(this, 'ProdDomain', {
      domainName: `api.${props.domainName}`,
      certificate: props.certificate,
    })

    this.devDomain = new apigwv2.DomainName(this, 'DevDomain', {
      domainName: `api.dev.${props.domainName}`,
      certificate: props.certificate,
    })

    new apigwv2.ApiMapping(this, 'ProdMapping', {
      api: prodApi,
      domainName: this.prodDomain,
    })

    new apigwv2.ApiMapping(this, 'DevMapping', {
      api: devApi,
      domainName: this.devDomain,
    })
  }
}
