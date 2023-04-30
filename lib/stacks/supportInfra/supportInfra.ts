import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { 
	aws_ec2 as ec2,
	aws_s3 as s3,
} 
from "aws-cdk-lib";

import * as network from 'raindancers-network'

import { AwsRegions } from "raindancers-network";
interface OperatingRegion {
	regionName: AwsRegions
}

interface SupportInfraProps extends cdk.StackProps {
	regions: AwsRegions[]
	superNet:  string;
	nonproduction?: boolean;
}

/**
 * Create a stack that contains a sharedserviceVPC
 */
export class SupportInfra extends cdk.Stack {

  ipamPool: string;
  loggingBucketName: string;

  constructor(scope: Construct, id: string, props: SupportInfraProps) {
    super(scope, id, props);

    const ipamRegions: OperatingRegion[] = [];
	props.regions.forEach((region) => {
		ipamRegions.push({regionName: region})
	})

    const earthIPAM = new ec2.CfnIPAM(this, "earthIPAM", {
        operatingRegions: ipamRegions
      }
    );

	const earthPool = new ec2.CfnIPAMPool(this, 'earthIPAMPool', {
		addressFamily: 'ipv4',
		ipamScopeId: earthIPAM.attrIpamId,
		provisionedCidrs: [{
		  cidr: props.superNet,
		}],
	});

	this.ipamPool = earthPool.attrIpamPoolId

	if ((props.nonproduction ?? false)) {     

		this.loggingBucketName = new s3.Bucket(this, "loggingbucket", {
		  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
		  encryption: s3.BucketEncryption.S3_MANAGED,
		  autoDeleteObjects: false,
		  removalPolicy: cdk.RemovalPolicy.RETAIN
		}).bucketName;
	  } else {
		this.loggingBucketName = new s3.Bucket(this, "loggingbucket", {
		  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
		  encryption: s3.BucketEncryption.S3_MANAGED,
		  autoDeleteObjects: true,
		  removalPolicy: cdk.RemovalPolicy.DESTROY,
		}).bucketName;
		;
	  }
  }
}
