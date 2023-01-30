import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
	aws_ec2 as ec2
}
from 'aws-cdk-lib';
import * as raindancersNetwork from 'raindancers-network';

interface RegionTwoProps extends cdk.StackProps {
	corenetwork: raindancersNetwork.CoreNetwork
	blueSegment: raindancersNetwork.CoreNetworkSegment
	greenSegment: raindancersNetwork.CoreNetworkSegment
}

export class RegionTwo extends cdk.Stack {
	constructor(scope: Construct, id: string, props: RegionTwoProps) {
	  super(scope, id, props);


		const greenVpc = new raindancersNetwork.EnterpriseVpc(this, 'greenEvpc', {
			vpc: new ec2.Vpc(this, 'greenVpc', {
				ipAddresses: ec2.IpAddresses.cidr('10.11.4.0/22'),
				maxAzs: 2,
				natGateways: 0,
				subnetConfiguration: [
					{
						name: 'linknet',
						cidrMask: 27,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					},
					{
						name: 'greensubnet',
						cidrMask: 24,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					}
				],
			})
		})

		greenVpc.attachToCloudWan({
			coreNetworkName: props.corenetwork.coreName as string,
			segmentName: props.greenSegment.segmentName as string
		})
		
		greenVpc.addRoutes({
			cidr: ['0.0.0.0/0'],
			description: 'defaultroute',
			subnetGroups: [
			'linknet',
			'greensubnet'
			],
			destination: raindancersNetwork.Destination.CLOUDWAN,
			cloudwanName: props.corenetwork.coreName as string,
		})

		const blueVpc = new raindancersNetwork.EnterpriseVpc(this, 'blueEvpc', {
			vpc: new ec2.Vpc(this, 'blueVpc', {
				ipAddresses: ec2.IpAddresses.cidr('10.11.8.0/22'),
				maxAzs: 2,
				natGateways: 0,
				subnetConfiguration: [
					{
						name: 'linknet',
						cidrMask: 27,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					},
					{
						name: 'bluesubnet',
						cidrMask: 24,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					}
				],
			})
		})

		blueVpc.attachToCloudWan({
			coreNetworkName: props.corenetwork.coreName as string,
			segmentName: props.blueSegment.segmentName as string
		})
		
		blueVpc.addRoutes({
			cidr: ['0.0.0.0/0'],
			description: 'defaultroute',
			subnetGroups: [
			'linknet',
			'bluesubnet'
			],
			destination: raindancersNetwork.Destination.CLOUDWAN,
			cloudwanName: props.corenetwork.coreName as string,
		})
	}
}