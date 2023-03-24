import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
	aws_ec2 as ec2,
	aws_s3 as s3,
	aws_iam as iam
}
from 'aws-cdk-lib';
import * as network from 'raindancers-network';
import { RedVpc } from '../../region1/vpc/redvpc';

interface RegionOneProps extends cdk.StackProps {
	corenetwork: network.CoreNetwork
	redSegment: network.CoreNetworkSegment
}

export class RegionOneCentralVpc extends cdk.Stack {
	loggingBucket: s3.Bucket
	centralVpcId: string
	resolverRole: iam.Role

	constructor(scope: Construct, id: string, props: RegionOneProps) {
	  super(scope, id, props);

	  this.loggingBucket = new s3.Bucket(this, 'LoggingBucket', {
		blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
		enforceSSL: true,
		})

		const redVpc = new RedVpc(this, 'RedVpc', {
			vpcCidr: '10.100.0.0/22',
			corenetwork: props.corenetwork,
			connectToSegment: props.redSegment,
			loggingBucket: this.loggingBucket,
		})
		
		this.centralVpcId = redVpc.vpc.vpcId
		this.resolverRole = redVpc.resolverRole
	}
}