import * as cdk from "aws-cdk-lib";
import * as constructs from "constructs";
import * as  path from 'path';
import {
  aws_lambda,
  custom_resources as cr,
  aws_iam as iam,
  aws_ec2 as ec2,
}
from "aws-cdk-lib";

export interface RapidRemoverProps {
  ipamScopeId: string;
  vpc: ec2.Vpc;
}

export class RapidRemover extends constructs.Construct {

  constructor(scope: constructs.Construct, id: string, props: RapidRemoverProps) {
    super(scope, id);

    const fn = new aws_lambda.Function(this, 'findpool', {
      runtime: aws_lambda.Runtime.PYTHON_3_9,
      handler: 'rapidremover.on_event',
      code: aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
      timeout: cdk.Duration.seconds(899),
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
          actions: [
           'ec2:ModifyIpamResourceCidr',
           'ec2:DeprovisionIpamPoolCidr'
          ],
          resources: ['*'],
      })
    )
  
  const fnProvider = new cr.Provider(this, 'isLocationRegisteredProvider', {
    onEventHandler: fn,
    logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
   });
  

  new cdk.CustomResource(this, `rapidremover`, {
    resourceType: 'Custom::Rapidremover',
    serviceToken: fnProvider.serviceToken,
    properties: {
      ResourceId: props.vpc.vpcId,
      ResourceCidr: props.vpc.vpcCidrBlock,
      ResourceRegion: cdk.Stack.of(this).region,
      CurrentIpamScopeId: props.ipamScopeId,
    },
  })
 }
}