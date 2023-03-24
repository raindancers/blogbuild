import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';
import { 
	aws_ec2 as ec2,
	aws_s3 as s3,
	aws_route53 as r53,
	aws_iam as iam,
}
from 'aws-cdk-lib';
import * as network from 'raindancers-network';

export interface RedVpcProps {
	vpcCidr: string
	corenetwork: network.CoreNetwork,
	connectToSegment: network.CoreNetworkSegment,
	loggingBucket: s3.Bucket
}

export class RedVpc extends constructs.Construct {

	vpc: ec2.Vpc
	resolverRole: iam.Role

	constructor(scope: constructs.Construct, id: string, props: RedVpcProps) {
		super(scope, id)

		// Assign some EIP's for the nateways
		const eip1 = new ec2.CfnEIP(this, 'EIP1forNatGateway')
		const eip2 = new ec2.CfnEIP(this, 'EIP2forNatGateway')

		const natgateways = ec2.NatProvider.gateway({
			eipAllocationIds: [ 
				eip1.attrAllocationId,
				eip2.attrAllocationId
			]
		})

		new cdk.CfnOutput(this, 'EIP1', { value: eip1.attrPublicIp })
    	new cdk.CfnOutput(this, 'EIP2', { value: eip2.attrPublicIp })

	  	const redVpc = new network.EnterpriseVpc(this, 'redEvpc', {
			vpc: new ec2.Vpc(this, 'redvpc', {
				ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
				maxAzs: 2,
				natGateways: 2,
				natGatewayProvider: natgateways,
				subnetConfiguration: [
					{
						name: 'linknet',
						cidrMask: 28,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					},
					{
						name: 'public',
						subnetType: ec2.SubnetType.PUBLIC,
						cidrMask: 28
					},
					{
						name: 'endpoints',
						cidrMask: 24,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					}
				],
			})
		})

		const redVpcAttachmentId = redVpc.attachToCloudWan({
			coreNetworkName: props.corenetwork.coreName,
			segmentName: props.connectToSegment.segmentName
		})

		redVpc.createFlowLog({
			bucket: props.loggingBucket,
			localAthenaQuerys: true,
			oneMinuteFlowLogs: true,
		});
	  
		  // add some endpoints
	  
		  new network.AwsServiceEndPoints(this, 'AWSEndpoints', {
			services: [
			  ec2.InterfaceVpcEndpointAwsService.SSM,
			],
			subnetGroup: 'endpoints',
			vpc: redVpc.vpc,
			s3GatewayInterface: true,
		  })

		// This will add a default route in each Cloudwan Segment, towards this egress VPC attachment
		redVpc.addCoreRoutes({
			policyTableArn: props.corenetwork.policyTable.tableArn,
			segments: [
			  'red',
			  'green',
			  'blue',
			],
			destinationCidrBlocks: ['0.0.0.0/0'],
			description: 'defaultroutetoEgress',
			coreName: props.corenetwork.coreName,
			attachmentId: redVpcAttachmentId
		})
		
		redVpc.addRoutes({
			cidr: ['10.0.0.0/8'],
			description: 'defaultroute',
			subnetGroups: [
			'linknet',
			'endpoints',
			'public',
			],
			destination: network.Destination.CLOUDWAN,
			cloudwanName: props.corenetwork.coreName
		})
		const r53Resolvers = new network.R53Resolverendpoints(this, 'RouteResolvers', {
			vpc: redVpc.vpc,
			subnetGroup: 'endpoints',
		})

		// this vpcs own zone
		new r53.PrivateHostedZone(this, 'redprivatezone', {
			zoneName: `${cdk.Aws.REGION}.red.multicolour.cloud`,
			vpc: redVpc.vpc
		})

		new network.CentralResolverRules(this, 'centralResolverRules', {
			domains: [
				`amazonaws.com`,
				'multicolour.cloud'
			],
			resolvers: r53Resolvers
		})
		this.vpc = redVpc.vpc

		this.resolverRole = new network.CentralAccountAssnRole(this, 'associationRole', {
			vpc: this.vpc,
			orgId: this.node.tryGetContext('orgId')
		}).assnRole


	}
}