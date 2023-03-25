import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
	aws_s3 as s3,
	aws_iam as iam
}
from 'aws-cdk-lib';
import * as network from 'raindancers-network';
import { SharedServiceVpc } from '../../constructs/sharedServiceVpc';

interface RegionTwoProps extends cdk.StackProps {
	/**
	 * the corenetwork that the vpc will be attached to
	 */
	readonly corenetwork: network.CoreNetwork
	/**
	 * Which segment of the CoreNetwork to attach the vpc to
	 */
	readonly redSegment: network.CoreNetworkSegment
}

/**
 * Create a stack that contains a sharedserviceVPC
 */
export class RegionTwoCentralVpc extends cdk.Stack {
	/**
	 * The VPC logging bucket for the region
	 */
	loggingBucket: s3.Bucket
	/**
	 * CentralVpcID
	 */
	centralVpcId: string
	/**
	 * Role to Assume for associating r53Zones
	 */
	resolverRole: iam.Role

	constructor(scope: Construct, id: string, props: RegionOneProps) {
	  super(scope, id, props);

	  const redVpc = new SharedServiceVpc(this, 'SharedServiceVPC', {
		vpcCidr: '10.200.0.0./22',
		vpcName: 'red',
		corenetwork: props.corenetwork,
		connectToSegment: props.redSegment,

	  })
	 		
	  this.centralVpcId = redVpc.vpc.vpcId
	  this.resolverRole = redVpc.resolverRole
	  this.loggingBucket = redVpc.loggingBucket
	}
}
