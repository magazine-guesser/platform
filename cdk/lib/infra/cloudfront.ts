import { Construct } from 'constructs'
import {
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_route53 as route53,
  aws_route53_targets as targets,
  aws_s3 as s3,
  aws_certificatemanager as acm,
} from 'aws-cdk-lib'

interface CloudFrontProps {
  domainName: string
  frontendBucket: s3.Bucket
  certificate: acm.ICertificate
}

export class CloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution

  constructor(scope: Construct, id: string, props: CloudFrontProps) {
    super(scope, id)

    const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.domainName,
    })

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(props.frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [props.domainName],
      certificate: props.certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    })

    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
    })
  }
}
