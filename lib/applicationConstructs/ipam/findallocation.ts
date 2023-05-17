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

export interface FindVpcIPAMAllocaitonIDProps {
  vpc: ec2.Vpc
}

export class FindVpcIPAMAllocaitonID extends constructs.Construct {

  allocationId: string;

  constructor(scope: constructs.Construct, id: string, props: FindVpcIPAMAllocaitonIDProps) {
    super(scope, id);

    const cfnVpc =	props.vpc.node.defaultChild as ec2.CfnVPC;
    const ipamVpcPool =  cfnVpc.ipv4IpamPoolId;

    // create a lambda to find the allocation Id
    const fn = new aws_lambda.Function(this, 'findpool', {
      runtime: aws_lambda.Runtime.PYTHON_3_9,
      handler: 'findallocationbycidr.on_event',
      code: aws_lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
      timeout: cdk.Duration.seconds(899),
    });

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
          actions: [
            'ec2:GetIpamPoolAllocations'
          ],
          resources: ['*'],
        })
    )
  
    const fnProvider = new cr.Provider(this, 'isLocationRegisteredProvider', {
      onEventHandler: fn,
      logRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
    });
  
    const findallocation = new cdk.CustomResource(this, `delayresource`, {
      serviceToken: fnProvider.serviceToken,
      properties: {
        Cidr: props.vpc.vpcCidrBlock,
        IpamPoolId: ipamVpcPool,
      },
    })

    this.allocationId = findallocation.getAttString('poolId')
 }
}