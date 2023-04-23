import * as cdk from "aws-cdk-lib";
import { CloudWanCore } from "../lib/stacks/core/cloudwan";
import { RegionOneWorkLoads } from "../lib/stacks/regionOne/regionOneWorkLoads";
import { RegionTwoWorkLoads } from "../lib/stacks/regionTwo/regionTwoWorkloads";
import { RegionOneCentralVpc } from "../lib/stacks/regionOne/regionOneEgress";
import { RegionTwoCentralVpc } from "../lib/stacks/regionTwo/regionTwoEgress";

const app = new cdk.App();

/**
 *  Create a Stack that creates a CloudWan, that spans two regions,
 * with three segments, red, green, blue.  THese need to be deployed
 * in us-east-1
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
  corenetwork: core.corenetwork.coreName,
  redSegment: core.redSegment.segmentName
});

// Create a central Service VPC in Region Two, and join it to the redSegment
const regionTwoEgress = new RegionTwoCentralVpc(app, "regionTwoEgress", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region2"),
  },
  corenetwork: core.corenetwork.coreName,
  redSegment: core.redSegment.segmentName
});

// Create VPC's in RegionOne, and add workloads to them.
new RegionOneWorkLoads(app, "RegionOneVPC", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region1"),
  },
  corenetwork: core.corenetwork.coreName,
  greenSegment: core.greenSegment.segmentName,
  blueSegment: core.blueSegment.segmentName,
  loggingbucket: regionOneEgress.loggingBucket,

});

//Create VPC's in RegionTwo, and add workloads to them.
new RegionTwoWorkLoads(app, "RegionTwoVPC", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: app.node.tryGetContext("region2"),
  },
  corenetwork: core.corenetwork.coreName,
  greenSegment: core.greenSegment.segmentName,
  blueSegment: core.blueSegment.segmentName,
  loggingbucket: regionTwoEgress.loggingBucket,
});
