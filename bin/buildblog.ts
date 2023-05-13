import * as cdk from "aws-cdk-lib";
import { CloudWanCore } from "../lib/stacks/core/cloudwan";
import { SupportInfra } from "../lib/stacks/supportInfra/supportInfra";


import { CentralVpc } from '../lib/stacks/centralVpc/centralVpc'
import { WorkLoads } from "../lib/stacks/workloads/workloads";
import { AwsRegions } from 'raindancers-network'


const app = new cdk.App();

const globalWan = [
  { 
    region: AwsRegions.US_WEST_1,
    ipamPoolCidr: '10.10.0.0/20'
  },
  { 
    region: AwsRegions.AP_SOUTHEAST_1,
    ipamPoolCidr: '10.10.16.0/20'
  },
  { 
    region: AwsRegions.AP_SOUTHEAST_2,
    ipamPoolCidr: '10.10.32.0/20'
  },
  { 
    region: AwsRegions.EU_WEST_1,
    ipamPoolCidr: '10.10.48.0/20'
  },
]

const globalWanRegions: AwsRegions[] = [];
globalWan.forEach((region) => {
  globalWanRegions.push(region.region);
})

// build the CoreWan
const core = new CloudWanCore(app, "CloudwanCore", {
  env: {
    account: app.node.tryGetContext("networkAccount"),
    region: AwsRegions.US_EAST_1,
  },
  cneRegions: globalWanRegions,
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
  regions: globalWan,
  crossRegionReferences: true,
})

// deploy central zones in each region
globalWanRegions.forEach((region) => {

  new CentralVpc(app, `${region}-centralVPC`, {
    env: { 
      account: app.node.tryGetContext("networkAccount"),
      region: region 
    },
    region: region,
    corenetwork: core.corenetwork.coreName,
    redSegment: core.redSegment.segmentName,
    crossRegionReferences: true,
    tableArn: core.policyTableArn
  })
})

globalWanRegions.forEach((region) => {

  new WorkLoads(app, `${region}-workloadVPC`, {
    env: { 
      account: app.node.tryGetContext("networkAccount"),
      region: region
    },
    corenetwork: core.corenetwork.coreName,
    greenSegment: core.greenSegment.segmentName,
    blueSegment: core.blueSegment.segmentName,
    regions: globalWanRegions,
    crossRegionReferences: true
  })
})

