import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
	aws_s3 as s3
}
from 'aws-cdk-lib';
import * as network from 'raindancers-network';
import { WorkLoadVpc } from '../../constructs/workLoadVpc';

interface RegionOneProps extends cdk.StackProps {
	corenetwork: network.CoreNetwork
	blueSegment: network.CoreNetworkSegment
	greenSegment: network.CoreNetworkSegment
	loggingbucket: s3.Bucket
	centralAccount:  network.CentralAccount,
	remoteVpc: network.RemoteVpc[]
}


export class RegionOne extends cdk.Stack {
	constructor(scope: Construct, id: string, props: RegionOneProps) {
	  super(scope, id, props);
		
		/**  
		 * Create a VPC that is attached to the green segment and contains a 
		 * the webserver 'green.<region2>.multicolour.cloud'
		 */ 
		new WorkLoadVpc(this, 'GreenVpc', {
			vpcCidr: '10.200.4.0/22',
			vpcName: 'green',
			corenetwork: props.corenetwork,
			connectToSegment: props.greenSegment,
			loggingBucket: props.loggingbucket,
			centralAccount:  props.centralAccount,
			remoteVpc: props.remoteVpc
		})

		/**  
		 * Create a VPC that is attached to the blue segment and contains a 
		 * the webserver 'blue.<region2>.multicolour.cloud'
		 */ 
		new WorkLoadVpc(this, 'BlueVpc', {
			vpcCidr: '10.200.8.0/22',
			vpcName: 'blue',
			corenetwork: props.corenetwork,
			connectToSegment: props.blueSegment,
			loggingBucket: props.loggingbucket,
			centralAccount:  props.centralAccount,
			remoteVpc: props.remoteVpc
		})
		
	}
}