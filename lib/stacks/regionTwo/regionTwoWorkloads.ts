import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_s3 as s3 } from "aws-cdk-lib";
import * as network from "raindancers-network";
import { WorkLoadVpc } from "../../applicationConstructs/workloadVPC/workLoadVpc";


interface RegionTwoProps extends cdk.StackProps {
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
  loggingbucket: s3.Bucket;
}

/**
 * A Stack that contains the WorkLoad VPCs and Worksloads in Region Two
 */
export class RegionTwoWorkLoads extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RegionTwoProps) {
    super(scope, id, props);

    /**
     * Create a VPC that is attached to the green segment and contains a
     * the webserver 'green.<region2>.exampleorg.cloud'
     */
    new WorkLoadVpc(this, "GreenVpc", {
      vpcCidr: "10.200.4.0/22",
      vpcName: "green",
      corenetwork: props.corenetwork,
      connectToSegment: props.greenSegment,
      loggingBucket: props.loggingbucket,
      region: this.region,
    });

    /**
     * Create a VPC that is attached to the blue segment and contains a
     * the webserver 'blue.<region2>.exampleorg.cloud'
     */
    new WorkLoadVpc(this, "BlueVpc", {
      vpcCidr: "10.200.8.0/22",
      vpcName: "blue",
      corenetwork: props.corenetwork,
      connectToSegment: props.blueSegment,
      loggingBucket: props.loggingbucket,
      region: this.region,
    });
  } 
}
