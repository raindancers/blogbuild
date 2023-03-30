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
  corenetwork: 'exampleNet',
  redSegment: 'red'
});

// Create a central Service VPC in Region Two, and join it to the redSegment
const regionTwoEgress = new RegionTwoCentralVpc(app, "regionTwoEgress", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region2"),
  },
  corenetwork: 'exampleNet',
  redSegment: 'red',
});

// Create VPC's in RegionOne, and add workloads to them.
new RegionOne(app, "RegionOneVPC", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region1"),
  },
  corenetwork: 'exampleNet',
  greenSegment: 'green',
  blueSegment: 'blue',
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
    {
      vpcId: regionTwoEgress.centralVpcId,
      vpcRegion: app.node.tryGetContext("region2"),
    },
  ],
  crossRegionReferences: true,
});

// Create VPC's in RegionTwo, and add workloads to them.
new RegionTwo(app, "RegionTwoVPC", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region2"),
  },
  corenetwork: 'exampleNet',
  greenSegment: 'green',
  blueSegment: 'blue',
  loggingbucket: regionTwoEgress.loggingBucket,
  centralAccount: {
    accountId: app.node.tryGetContext("networkAccount"),
    roleArn: regionTwoEgress.resolverRole.roleArn
  },
  remoteVpc: [
    {
      vpcId: regionOneEgress.centralVpcId,
      vpcRegion: app.node.tryGetContext("region1"),
    },
    {
      vpcId: regionTwoEgress.centralVpcId,
      vpcRegion: app.node.tryGetContext("region2"),
    },
  ],
  crossRegionReferences: true
});
