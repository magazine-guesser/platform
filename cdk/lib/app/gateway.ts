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

interface ApiOptions {
  id: string
  alias: lambda.IAlias
  domainName: string
  certificate: acm.ICertificate
  throttle: { rateLimit: number; burstLimit: number }
}

export class GatewayConstruct extends Construct {
  public readonly prodDomain: apigwv2.DomainName
  public readonly devDomain: apigwv2.DomainName

  constructor(scope: Construct, id: string, props: GatewayProps) {
    super(scope, id)

    this.prodDomain = this.createApi(scope, {
      id: 'Prod',
      alias: props.prodAlias,
      domainName: `api.${props.domainName}`,
      certificate: props.certificate,
      throttle: { rateLimit: 50, burstLimit: 100 },
    })

    this.devDomain = this.createApi(scope, {
      id: 'Dev',
      alias: props.devAlias,
      domainName: `api.dev.${props.domainName}`,
      certificate: props.certificate,
      throttle: { rateLimit: 10, burstLimit: 20 },
    })
  }

  private createApi(scope: Construct, options: ApiOptions): apigwv2.DomainName {
    const api = new apigwv2.HttpApi(scope, `${options.id}Api`, {
      defaultIntegration: new integrations.HttpLambdaIntegration(
        `${options.id}Integration`,
        options.alias
      ),
      createDefaultStage: false,
    })

    const stage = new apigwv2.HttpStage(scope, `${options.id}Stage`, {
      httpApi: api,
      autoDeploy: true,
      throttle: options.throttle,
    })

    api.addRoutes({
      path: '/admin/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration(
        `${options.id}AdminIntegration`,
        options.alias
      ),
    })

    const cfnStage = stage.node.defaultChild as apigwv2.CfnStage
    cfnStage.routeSettings = {
      'ANY /admin/{proxy+}': {
        throttlingRateLimit: 2,
        throttlingBurstLimit: 5,
      },
    }

    const domain = new apigwv2.DomainName(scope, `${options.id}Domain`, {
      domainName: options.domainName,
      certificate: options.certificate,
    })

    new apigwv2.ApiMapping(scope, `${options.id}Mapping`, {
      api,
      domainName: domain,
      stage,
    })

    return domain
  }
}
