import * as cdk from "aws-cdk-lib";
import * as constructs from "constructs";
import * as  path from 'path';
import {
  aws_lambda,
  custom_resources as cr,
  aws_iam as iam,
}
from "aws-cdk-lib";

export interface FindpoolProps {
  descriptonSearch: string
}

export class FindPool extends constructs.Construct {

  serviceToken: string;

  constructor(scope: constructs.Construct, id: string, props: FindpoolProps) {
    super(scope, id);

  const fn = new aws_lambda.Function(this, 'findpool', {
    runtime: aws_lambda.Runtime.PYTHON_3_9,
    handler: 'findipampool.on_event',
    code: aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
    timeout: cdk.Duration.seconds(899),
    environment: {
      DESCRIPTION_SEARCH: props.descriptonSearch
    }
  });

  fn.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
        actions: [
          'ec2:DescribeIpamPools'
        ],
        resources: ['*'],
    })
  )
  
  const fnProvider = new cr.Provider(this, 'isLocationRegisteredProvider', {
    onEventHandler: fn,
    logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
   });
  
   this.serviceToken =fnProvider.serviceToken;
 }
}