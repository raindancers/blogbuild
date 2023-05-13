import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_s3 as s3, aws_iam as iam, aws_ec2 as ec2 } from "aws-cdk-lib";
import { SharedServiceVpc } from "../../applicationConstructs/sharedServiceVPC/sharedServiceVpc";


interface CentralVpcProps extends cdk.StackProps {

  readonly region: string;
  /**
   * the corenetwork that the vpc will be attached to
   */
  readonly corenetwork: string;
  /**
   * Which segment of the CoreNetwork to attach the vpc to
   */
  readonly redSegment: string;

  readonly tableArn: string;
}

/**
 * Create a stack that contains a sharedserviceVPC
 */
export class CentralVpc extends cdk.Stack {
  /**
   * CentralVpcID
   */
  centralVpc: ec2.Vpc;
  /**
   * Role to Assume for associating r53Zones
   */
  resolverRole: iam.Role;
  /**
   * tableArn
   */
  





























































  constructor(scope: Construct, id: string, props: CentralVpcProps) {
    super(scope, id, props);

    const redVpc = new SharedServiceVpc(this, "SharedServiceVPC", {
      vpcName: "red",
      corenetwork: props.corenetwork,
      connectToSegment: props.redSegment,
      region: props.region,
      tableArn: props.tableArn,
      // this is an opt-out flag, that should be removed if this stack is used for production 
      // workloads.   Setting to true, will result in logs from vpc flow logs being deleted
      // automatically when the stack is destroy.
    });

    this.centralVpc = redVpc.vpc;
    this.resolverRole = redVpc.resolverRole;
    
  }
}
