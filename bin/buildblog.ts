import * as cdk from "aws-cdk-lib";
import { CloudWanCore } from "../lib/stacks/core/cloudwan";
import { SupportInfra } from "../lib/stacks/supportInfra/supportInfra";


import { CentralVpc } from '../lib/stacks/centralVpc/centralVpc'
import { WorkLoads } from "../lib/stacks/workloads/workloads";
import { AwsRegions } from 'raindancers-network'


const app = new cdk.App();

/**
 *  Create a Stack that creates a CloudWan, that spans two regions,
 * with three segments, red, green, blue.  THese need to be deployed
 * in us-east-1
 **/

//https://docs.aws.amazon.com/network-manager/latest/cloudwan/what-is-cloudwan.html#cloudwan-available-regions
const exampleNetRegions = [
  AwsRegions.US_WEST_1,
  // AwsRegions.US_WEST_2,
  // AwsRegions.US_EAST_1,
  // AwsRegions.US_EAST_2,
  AwsRegions.AP_SOUTHEAST_1,
  AwsRegions.AP_SOUTHEAST_2,  
  // AwsRegions.AP_SOUTH_1,
  // AwsRegions.AP_NORTHEAST_1,
  // AwsRegions.AP_NORTHEAST_2,
  // AwsRegions.CA_CENTRAL_1,
  // AwsRegions.EU_CENTRAL_1,
  AwsRegions.EU_WEST_1,
  // AwsRegions.EU_WEST_2,
  // AwsRegions.EU_WEST_3,
  // AwsRegions.EU_NORTH_1,
]

// build the CoreWan
const core = new CloudWanCore(app, "CloudwanCore", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: AwsRegions.US_EAST_1,
  },
  cneRegions: exampleNetRegions,
  coreName: 'exampleNet',
  asnRanges: ["65200-65232"],
  insideCidrBlocks: ["10.255.0.0/19"],
  crossRegionReferences: true,
});

// We will use IPAM to allocate address space for the VPC's
const supportInfra = new SupportInfra(app, 'ipam', {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: AwsRegions.US_EAST_1,
  },
  regions: exampleNetRegions,
  superNet: '10.10.0.0/16',
  crossRegionReferences: true,
})

// deploy central zones in each region
exampleNetRegions.forEach((region) => {

  new CentralVpc(app, `${region}-centralVPC`, {
    env: { 
      account: app.node.tryGetContext("networkAccount"),
      region: region 
    },
    region: region,
    corenetwork: core.corenetwork.coreName,
    redSegment: core.redSegment.segmentName,
    ipamPool: supportInfra.ipamPool,
    loggingBucketName: supportInfra.loggingBucketName,
    crossRegionReferences: true
  })
})

exampleNetRegions.forEach((region) => {

  new WorkLoads(app, `${region}-workloadVPC`, {
    env: { 
      account: app.node.tryGetContext("networkAccount"),
      region: region
    },
    corenetwork: core.corenetwork.coreName,
    greenSegment: core.greenSegment.segmentName,
    blueSegment: core.blueSegment.segmentName,
    loggingbucketName: supportInfra.loggingBucketName,
    regions: exampleNetRegions,
    ipamPool: supportInfra.ipamPool,
    crossRegionReferences: true
  })
})

