import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_s3 as s3, Stack } from "aws-cdk-lib";
import * as network from "raindancers-network";
import { WorkLoadVpc } from "../../applicationConstructs/workloadVPC/workLoadVpc";

interface RegionOneProps extends cdk.StackProps {
  /**
   * The coreNetwork the vpcs will be attached to
   */
  corenetwork: network.CoreNetwork;
  /**
   * THe bluesegment of the coreNetwork
   */
  blueSegment: network.CoreNetworkSegment;
  /**
   * the Green segment of the coreNetwork
   */
  greenSegment: network.CoreNetworkSegment;
  /**
   * S3 bucket for Logging VPC flows
   */
  loggingbucket: s3.Bucket;
  /**
   * the Central ACcount
   */
  centralAccount: network.CentralAccount;
  /**
   * The Vpcs in which to associate Route53 Zones
   */
  remoteVpc: network.RemoteVpc[];
}

export class RegionOne extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RegionOneProps) {
    super(scope, id, props);

    /**
     * Create a VPC that is attached to the green segment and contains a
     * the webserver 'green.<region1>.multicolour.cloud'
     */
    new WorkLoadVpc(this, "GreenVpc", {
      vpcCidr: "10.100.4.0/22",
      vpcName: "green",
      corenetwork: props.corenetwork,
      connectToSegment: props.greenSegment,
      loggingBucket: props.loggingbucket,
      centralAccount: props.centralAccount,
      remoteVpc: props.remoteVpc,
      region: this.region
    });



    /**
     * Create a VPC that is attached to the blue segment and contains a
     * the webserver 'blue.<region1>.multicolour.cloud'
     */
    new WorkLoadVpc(this, "BlueVpc", {
      vpcCidr: "10.100.8.0/22",
      vpcName: "blue",
      corenetwork: props.corenetwork,
      connectToSegment: props.blueSegment,
      loggingBucket: props.loggingbucket,
      centralAccount: props.centralAccount,
      remoteVpc: props.remoteVpc,
      region: this.region,
    });
  }
}
