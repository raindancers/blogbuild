import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_s3 as s3, Stack } from "aws-cdk-lib";
import * as network from "raindancers-network";
import { WorkLoadVpc } from "../../applicationConstructs/workloadVPC/workLoadVpc";


interface WorkLoadsProps extends cdk.StackProps {
  /**
   * The coreNetwork the vpcs will be attached to
   */
  corenetwork: string;
  /**
   * THe bluesegment of the coreNetwork
   */
  blueSegment: string;
  /**
   * the Green segment of the coreNetwork
   */
  greenSegment: string;
  /**
   * S3 bucket for Logging VPC flows
   */

  regions: network.AwsRegions[];
  
}

export class WorkLoads extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WorkLoadsProps) {
    super(scope, id, props);

    /**
     * Create a VPC that is attached to the green segment and contains a
     * the webserver 'green.<region1>.exampleorg.cloud'
     */
    new WorkLoadVpc(this, "GreenVpc", {
      regions: props.regions,
      vpcName: "green",
      corenetwork: props.corenetwork,
      connectToSegment: props.greenSegment,
      region: this.region
    });

    new WorkLoadVpc(this, "BlueVpc", {
      regions: props.regions,
      vpcName: "blue",
      corenetwork: props.corenetwork,
      connectToSegment: props.blueSegment,
      region: this.region,
    });
  }
}
