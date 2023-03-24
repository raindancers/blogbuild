import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
	aws_networkmanager as networkmanager,
	aws_ec2 as ec2,
	aws_s3 as s3
}
from 'aws-cdk-lib';
import * as network from 'raindancers-network';
import { GreenVpc } from '../../region2/vpc/greenvpc';
import { BlueVpc } from '../../region2/vpc/bluevpc';

interface RegionTwoProps extends cdk.StackProps {
	corenetwork: network.CoreNetwork
	blueSegment: network.CoreNetworkSegment
	redSegment: network.CoreNetworkSegment
	greenSegment: network.CoreNetworkSegment
	loggingbucket: s3.Bucket,
	centralAccount:  network.CentralAccount,
	remoteVpc: network.RemoteVpc[]
}

export class RegionTwo extends cdk.Stack {
	constructor(scope: Construct, id: string, props: RegionTwoProps) {
	  super(scope, id, props);
		
		new GreenVpc(this, 'GreenVpc', {
			vpcCidr: '10.200.4.0/22',
			corenetwork: props.corenetwork,
			connectToSegment: props.greenSegment,
			loggingBucket: props.loggingbucket,
			centralAccount:  props.centralAccount,
			remoteVpc: props.remoteVpc
		})

		new BlueVpc(this, 'BlueVpc', {
			vpcCidr: '10.200.8.0/22',
			corenetwork: props.corenetwork,
			connectToSegment: props.blueSegment,
			loggingBucket: props.loggingbucket,
			centralAccount:  props.centralAccount,
			remoteVpc: props.remoteVpc
		})
		
	}
}