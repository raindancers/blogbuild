import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_s3 as s3, aws_iam as iam } from "aws-cdk-lib";
import { SharedServiceVpc } from "../../applicationConstructs/sharedServiceVPC/sharedServiceVpc";

interface RegionOneProps extends cdk.StackProps {
  /**
   * the corenetwork that the vpc will be attached to
   */
  readonly corenetwork: string;
  /**
   * Which segment of the CoreNetwork to attach the vpc to
   */
  readonly redSegment: string;
}

/**
 * Create a stack that contains a sharedserviceVPC
 */
export class RegionOneCentralVpc extends cdk.Stack {
  /**
   * The VPC logging bucket for the region
   */
  loggingBucket: s3.Bucket;
  /**
   * CentralVpcID
   */
  centralVpcId: string;
  /**
   * Role to Assume for associating r53Zones
   */
  resolverRole: iam.Role;

  constructor(scope: Construct, id: string, props: RegionOneProps) {
    super(scope, id, props);

    const redVpc = new SharedServiceVpc(this, "SharedServiceVPC", {
      vpcCidr: "10.100.0.0/22",
      vpcName: "red",
      corenetwork: props.corenetwork,
      connectToSegment: props.redSegment,
      region: this.node.tryGetContext("region1"),
      // this is an opt-out flag, that should be removed if this stack is used for production 
      // workloads.   Setting to true, will result in logs from vpc flow logs being deleted
      // automatically when the stack is destroy.
      nonproduction: true,
    });

    this.centralVpcId = redVpc.vpc.vpcId;
    this.resolverRole = redVpc.resolverRole;
    this.loggingBucket = redVpc.loggingBucket;
  }
}
