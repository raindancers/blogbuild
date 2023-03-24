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

export interface SharedServiceVpcProps {
	vpcName: string
	vpcCidr: string
	corenetwork: network.CoreNetwork,
	connectToSegment: network.CoreNetworkSegment,
	loggingBucket: s3.Bucket
}

/**
 * This will create a VPC, that contains an Egress to the internet. THis can be used by all vpcs
 * It also contains a selection of endpoints.
 * This Vpc will span two Availablity Zones.
 */
export class SharedServiceVpc extends constructs.Construct {

	vpc: ec2.Vpc
	resolverRole: iam.Role

	constructor(scope: constructs.Construct, id: string, props: SharedServiceVpcProps) {
		super(scope, id)

		// Assign some EIP's for the Nat Gateways.  Using EIP's means that the IP adress's of the 
		// nat gateways will remain constant, if they are dropped and reployed.

		const eip1 = new ec2.CfnEIP(this, 'EIP1forNatGateway')
		const eip2 = new ec2.CfnEIP(this, 'EIP2forNatGateway')

		// in order to use the EIP's a Nat Provider is required. These
		// these however are still however standard Nat Gateways. 
		const natgateways = ec2.NatProvider.gateway({
			eipAllocationIds: [ 
				eip1.attrAllocationId,
				eip2.attrAllocationId
			]
		})

		// Create Outputs for the stack, This allows you to easily find the IP address's in the 
		// the resulting Cloudformation Stacks, if you need them. 
		new cdk.CfnOutput(this, 'EIP1', { value: eip1.attrPublicIp })
		new cdk.CfnOutput(this, 'EIP2', { value: eip2.attrPublicIp })


		// Create an Enterprise Vpc.  This uses the 'EntepriseVpc' contruct from the raindancers-network library.
		// the Construct essentially provides a way to provide additional methods on a vpc. 
	  	const sharedServiceVpc = new network.EnterpriseVpc(this, 'redEvpc', {

			// this vpc is the standard ec2.Vpc from the cdk-lib.  This allows you to form the
			// vpc in many different ways.  For example you could use Ipam to provide the address space
			// your self.  You could also import the Vpc.  
			// https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html

			vpc: new ec2.Vpc(this, 'redvpc', {
				ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
				maxAzs: 2,
				natGateways: 2,
				natGatewayProvider: natgateways,
				subnetConfiguration: [
					// the linknet subnet is where the endpoints for connection to Cloudwan will be placed.
					// by default the .attachmentToCloudwan method will look for the subnetGroupName 'linknet'. 
					// If you rename this, ensure you provide the alternative name in the method 
					{
						name: 'linknet',
						cidrMask: 28,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					},
					// this subnetGroup will be where NatGateways are placed. 
					{
						name: 'public',
						subnetType: ec2.SubnetType.PUBLIC,
						cidrMask: 28
					},
					// this subnet is where shared interface endpoints are placed.
					{
						name: 'endpoints',
						cidrMask: 24,
						subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
					}
				],
			})
		})

		// the method .attachToCloudwan attaches the sharedService Enterprise VPC to the the Cloudwan
		// on a specfic segment. Remember that the cloudwan policy must allow the attachment. 
		const attachmentId = sharedServiceVpc.attachToCloudWan({
			coreNetworkName: props.corenetwork.coreName,
			segmentName: props.connectToSegment.segmentName,
			
		})
		// It is both good practice and often required by security policy to create flowlogs for the VPC which are
		// logged in a central S3 Bucket.  THis is a convience method to do this, and additionally create athena querys
		// which will provide a convient way to search the logs. 

		sharedServiceVpc.createFlowLog({
			bucket: props.loggingBucket,
			localAthenaQuerys: true,
			oneMinuteFlowLogs: true,
		});
	  
	    // In this 'shared' service vpc, We add a selection of AWS service Endpoints, which 
		// can be reached not only in this vpc, but the other vpcs that are attached to the cloudwan.
		// This can be helpful where a vpc needs infrequent to moderate access to a service. Consideration
		// of the balance between the cost of the endpoint vs traffic charges needs to be made.  

		new network.AwsServiceEndPoints(this, 'AWSEndpoints', {
		services: [
			ec2.InterfaceVpcEndpointAwsService.SSM,
		],
		subnetGroup: 'endpoints',
		vpc: sharedServiceVpc.vpc,
		s3GatewayInterface: true,
		})

		// This method, will add Routes in the specifed Cloudwan Routing tables towards the Cloudwan Attachment for this Vpc.
		// In this network, we want all our cloudwan segments to be able to reach the internet, via our shared egress 

		sharedServiceVpc.addCoreRoutes({
			policyTableArn: props.corenetwork.policyTable.tableArn,
			segments: [
			  'red',
			  'green',
			  'blue',
			],
			destinationCidrBlocks: ['0.0.0.0/0'],
			description: 'defaultroutetoEgress',
			coreName: props.corenetwork.coreName,
			attachmentId: attachmentId
		})
		
		// each subnet which is is member of the VPC, has its own routing table. ( this is the design of the ec2.Vpc ).
		// we need to add a route in the routing tables towards the cloudwan attachment, to that traffic can reach other vpcs
		// This method allows for multiple cidr ranges to be added to multiple routing tables.  While in this example we set the destination
		// as cloudwan, this .addRoutes() method, allows for easy routing to TransitGateways, and Firewalls.  It is AZ aware, and will route
		// traffic so it does not cross AZ boundarys.

		sharedServiceVpc.addRoutes({
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

		// We provide Route53 resolver endpoints, so that we can provide a consistent DNS resolution across the network. 
		// This forms part of the infrastructure that will allow hosts in different VPC's to resolve hosts in other VPC's by name. 
		const r53Resolvers = new network.R53Resolverendpoints(this, 'RouteResolvers', {
			vpc: sharedServiceVpc.vpc,
			subnetGroup: 'endpoints',
		})

		// This vpc, will have have a a Private/Internal Route53 Zone created and associated with it. 
		new r53.PrivateHostedZone(this, 'privatezone', {
			zoneName: `${cdk.Aws.REGION}.${props.vpcName}.multicolour.cloud`,
			// the r53.PrivateHostedZone class expects a ec2.Vpc as a property. The sharedServiceVpc is of type 'EntepriseVpc'
			// the EnterpriseVpc has a property (vpc) which we are able to access which is of type 'ec2.Vpc'
			vpc: sharedServiceVpc.vpc
		})

		// We want vpcs attached to the the Cloudwan, to be able to resolve each other. This class creates resolver rules which
		// THese resolver rules will be shared to our AWS organisation, So, they can be assocated with each of the vpcs attached.
		// We create and share a rule for 'amazonaws.com' so that the private interface endpoints names can be resolved to our private endpoints.
		// we create and share a rule for 'multicolour.cloud' which is our internal domain name.  

		new network.CentralResolverRules(this, 'centralResolverRules', {
			domains: [
				`amazonaws.com`,
				'multicolour.cloud'
			],
			resolvers: r53Resolvers
		})

		// We need to provide a role, that has permissions to associate an internal Route53 zone with this VPC.  THis is used later, by 
		// a lambda that assosciates a zone associated with a vpc, to the central account as well.  The central VPC then can resolve every zone.

		this.resolverRole = new network.CentralAccountAssnRole(this, 'associationRole', {
			vpc: this.vpc,
			orgId: this.node.tryGetContext('orgId')
		}).assnRole
		

	}
}