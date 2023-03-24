import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';
import { 
	aws_networkmanager as networkmanager,
	aws_ec2 as ec2,
	aws_s3 as s3
}
from 'aws-cdk-lib';
import * as network from 'raindancers-network';

export interface GreenVpcProps {
	vpcCidr: string
	corenetwork: network.CoreNetwork,
	connectToSegment: network.CoreNetworkSegment,
	loggingBucket: s3.Bucket
	centralAccount:  network.CentralAccount
	remoteVpc: network.RemoteVpc[]
}

export class GreenVpc extends constructs.Construct {

	constructor(scope: constructs.Construct, id: string, props: GreenVpcProps) {
		super(scope, id)

	  	const greenVpc = new network.EnterpriseVpc(this, 'GreenEvpc', {
			vpc: new ec2.Vpc(this, 'greenvpc', {
				ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
				maxAzs: 2,
				natGateways: 0,
				subnetConfiguration: [
					{
						name: 'linknet',
						cidrMask: 28,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					},
					{
						name: 'servers',
						cidrMask: 24,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					}
				],
			})
		})

		greenVpc.attachToCloudWan({
			coreNetworkName: props.corenetwork.coreName,
			segmentName: props.connectToSegment.segmentName
		})

		greenVpc.createFlowLog({
			bucket: props.loggingBucket,
			localAthenaQuerys: true,
			oneMinuteFlowLogs: true,
		});
	  
		
		greenVpc.addRoutes({
			cidr: ['0.0.0.0/0'],
			description: 'defaultroute',
			subnetGroups: [
			'servers',
			],
			destination: network.Destination.CLOUDWAN,
			cloudwanName: props.corenetwork.coreName
		})

		new network.AssociateSharedResolverRule(this, 'r3rules', {
			domainNames: [
				'multicolour.cloud',
				`${cdk.Aws.REGION}.amazonaws.com`
			],
			vpc: greenVpc.vpc,
		})
		
		/**
		 * Create a Local R53 Zone, and associate it with the central resolver account, to allow
		 * cross vpc resolution
		 */

		const vpcZone = new network.EnterpriseZone(this, 'EnterpriseR53Zone', {
			enterpriseDomainName: `${cdk.Aws.REGION}.green.multicolour.cloud`,
			localVpc: greenVpc.vpc,
			remoteVpc: props.remoteVpc,
			centralAccount: props.centralAccount
		})


	}
}