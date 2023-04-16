import * as cdk from "aws-cdk-lib";
import { CloudWanCore } from "../lib/stacks/core/clouwan";
import { RegionOne } from "../lib/stacks/regionOne/regionOneWorkLoads";
import { RegionTwo } from "../lib/stacks/regionTwo/regionTwoWorkloads";
import { RegionOneCentralVpc } from "../lib/stacks/regionOne/regionOneEgress";
import { RegionTwoCentralVpc } from "../lib/stacks/regionTwo/regionTwoEgress";

const app = new cdk.App();

/**
 *  Create a Stack that creates a CloudWan, that spans two regions,
 * with three segments, red, green, blue
 **/
const core = new CloudWanCore(app, "CloudwanCore", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: "us-east-1",
  },
});

/**
 * Create a Central Service VPC in Region One, and join it to the redSegment
 */
const regionOneEgress = new RegionOneCentralVpc(app, "regionOneEgress", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region1"),
  },
  corenetwork: 'ExampleNet-corenetworkname',
  redSegment: 'ExampleNet-redSegmentName',
});

// Create a central Service VPC in Region Two, and join it to the redSegment
const regionTwoEgress = new RegionTwoCentralVpc(app, "regionTwoEgress", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region2"),
  },
  corenetwork: 'ExampleNet-corenetworkname',
  redSegment: 'ExampleNet-redSegmentName',
});

// Create VPC's in RegionOne, and add workloads to them.
new RegionOne(app, "RegionOneVPC", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region1"),
  },
  corenetwork: 'ExampleNet-corenetworkname',
  greenSegment: 'ExampleNet-greenSegmentName',
  blueSegment: 'ExampleNet-blueSegmentName',



  loggingbucket: regionOneEgress.loggingBucket,
  centralAccount: {
    accountId: app.node.tryGetContext("networkAccount"),
    roleArn: regionOneEgress.resolverRole.roleArn,
  },
  remoteVpc: [
    {
      vpcId: regionOneEgress.centralVpcId,
      vpcRegion: app.node.tryGetContext("region1"),
    },
  ],
  crossRegionVpc: [
    {
      vpcIdSSmParamter: `${app.node.tryGetContext("region2").replace(/-/g,'')}centralVpcId`,
      vpcRegion: app.node.tryGetContext("region2")
    },
  ],
});

//Create VPC's in RegionTwo, and add workloads to them.
new RegionTwo(app, "RegionTwoVPC", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region2"),
  },
  corenetwork: 'ExampleNet-corenetworkname',
  greenSegment: 'ExampleNet-greenSegmentName',
  blueSegment: 'ExampleNet-blueSegmentName',
  loggingbucket: regionTwoEgress.loggingBucket,
  centralAccount: {
    accountId: app.node.tryGetContext("networkAccount"),
    roleArn: regionTwoEgress.resolverRole.roleArn,
  },
  // export interface CentralAccount {
  //   readonly accountId: string;
  //   readonly roleArn: string;
  // }
  remoteVpc: [
    {
      vpcId: regionTwoEgress.centralVpcId,
      vpcRegion: app.node.tryGetContext("region2"),
    },
  ],
  crossRegionVpc: [
    {
      vpcIdSSmParamter: `${app.node.tryGetContext("region1").replace(/-/g,'')}centralVpcId`,
      vpcRegion: app.node.tryGetContext("region1")
    },
  ],
});
