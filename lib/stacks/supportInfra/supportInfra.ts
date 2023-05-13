import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_ec2 as ec2,
  aws_s3 as s3,
}
from "aws-cdk-lib";
import { AwsRegions } from "raindancers-network";

interface OperatingRegion {
  regionName: AwsRegions
}

interface SupportInfraProps extends cdk.StackProps {
  regions: {
    region: AwsRegions,
    ipamPoolCidr: string
  }[],
  nonproduction?: boolean;
}

/**
 * Create a stack that contains a sharedserviceVPC
 */
export class SupportInfra extends cdk.Stack {

  constructor(scope: Construct, id: string, props: SupportInfraProps) {
    super(scope, id, props);

    const ipamRegions: OperatingRegion[] = [];
    props.regions.forEach((region) => {
      ipamRegions.push({regionName: region.region})
    })

    const earthIPAM = new ec2.CfnIPAM(this, "earthIPAM", {
      operatingRegions: ipamRegions
    });

    const earthIPAMScope = new ec2.CfnIPAMScope(this, 'MyCfnIPAMScope', {
      ipamId: earthIPAM.attrIpamId,
      description: 'earthIPAMscope',
    });

    props.regions.forEach((region) => {
      const earthPool = new ec2.CfnIPAMPool(this, `earthIPAMPool${region.region}`, {
        addressFamily: 'ipv4',
        description: `earthIPAMPool${region.region}`,
        ipamScopeId: earthIPAMScope.attrIpamScopeId,
        provisionedCidrs: [{
          cidr: region.ipamPoolCidr
        }],
        locale: region.region,
        tags: [{
          key : 'Name',
          value : `earthIPAMPool${region.region}`
        }]
      });
    });
  }
}

