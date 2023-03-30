import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { 
  aws_s3 as s3,
  aws_iam as iam,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import * as network from "raindancers-network";
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
  /**
   * 
   */
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

    const tableArn =
      ssm.StringParameter.fromSecureStringParameterAttributes(
        this,
        'tableArn',
        {parameterName: '/my-app/dev/db-password', version: 1},
      );

    const redVpc = new SharedServiceVpc(this, "SharedServiceVPC", {
      vpcCidr: "10.100.0.0/22",
      vpcName: "red",
      corenetwork: props.corenetwork,
      connectToSegment: props.redSegment,
      tableArn: tableArn.stringValue
    });

    this.centralVpcId = redVpc.vpc.vpcId;
    this.resolverRole = redVpc.resolverRole;
    this.loggingBucket = redVpc.loggingBucket;
  }
}
