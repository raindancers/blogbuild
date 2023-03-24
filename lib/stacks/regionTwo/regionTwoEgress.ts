import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
	aws_ec2 as ec2,
	aws_s3 as s3
}
from 'aws-cdk-lib';
import * as network from 'raindancers-network';
import { RedVpc } from '../../region2/vpc/redvpc';

interface RegionTwoProps extends cdk.StackProps {
	corenetwork: network.CoreNetwork
	redSegment: network.CoreNetworkSegment
	
}

export class RegionTwoCentralVpc extends cdk.Stack {
	loggingBucket: s3.Bucket
	centralVpc: ec2.Vpc


	constructor(scope: Construct, id: string, props: RegionTwoProps) {
	  super(scope, id, props);

	  this.loggingBucket = new s3.Bucket(this, 'LoggingBucket', {
		blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
		enforceSSL: true,
	})

		this.centralVpc = new RedVpc(this, 'RedVpc', {
			vpcCidr: '10.200.0.0/22',
			corenetwork: props.corenetwork,
			connectToSegment: props.redSegment,
			loggingBucket: this.loggingBucket,
		}).vpc
		
	}
}