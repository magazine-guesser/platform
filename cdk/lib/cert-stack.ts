import * as cdk from 'aws-cdk-lib/core'
import { Construct } from 'constructs'
import {
    aws_certificatemanager as acm,
    aws_route53 as route53
} from 'aws-cdk-lib'

interface CertStackProps extends cdk.StackProps {
    domainName: string
}

export class CertStack extends cdk.Stack {
    public readonly certificate: acm.Certificate

    constructor(scope: Construct, id: string, props: CertStackProps) {
        super(scope, id, props)

        const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
            domainName: props.domainName
        })

        this.certificate = new acm.Certificate(this, 'Cert', {
            domainName: props.domainName,
            subjectAlternativeNames: [`*.${props.domainName}`],
            validation: acm.CertificateValidation.fromDns(hostedZone)
        })
    }
}