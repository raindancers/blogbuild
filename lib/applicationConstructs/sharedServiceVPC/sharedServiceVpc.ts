import * as cdk from "aws-cdk-lib";
import * as constructs from "constructs";
import {
  aws_ec2 as ec2,
  aws_s3 as s3,
  aws_route53 as r53,
  aws_iam as iam,
} from "aws-cdk-lib";
import * as network from "raindancers-network";

export interface SharedServiceVpcProps {
  /**
   * The name for the VPC
   */
  vpcName: string;
  /**
   * A cidr range for the Vpc
   */
  vpcCidr: string;
  /**
   * The corenetwork which the VPC can be attached to.
   */
  corenetwork: string;
  /**
   * The Segment on which the coreNetwork Segment will be attached to.
   */
  connectToSegment: string;
  /**
   * 
   */
  region: string;
  /**
  *
  */
  nonproduction?: boolean | undefined;
  /**
   * 
   */
}

/**
 * This will create a VPC, that contains an Egress to the internet. THis can be used by all vpcs
 * It also contains a selection of endpoints.
 * This Vpc will span two Availablity Zones.
 */
export class SharedServiceVpc extends constructs.Construct {
  /**
   * the underlying Vpc for this Enteprise Vpc
   */
  vpc: ec2.Vpc;
  /**
   * Iam Role which can be assumed to do cross account zone associations.
   */
  resolverRole: iam.Role;
  /**
   *
   */
  loggingBucket: s3.Bucket;

  constructor(scope: constructs.Construct, id: string, props: SharedServiceVpcProps) {
    super(scope, id);

    // We can optional flag that this is a non production environment. This will allow us to 
    // delete s3 log objects when we destroy the stacks.  In a production environment protecting the 
    // logs is important. 

    if ((props.nonproduction ?? false)) {     

      this.loggingBucket = new s3.Bucket(this, "loggingbucket", {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        autoDeleteObjects: false,
        removalPolicy: cdk.RemovalPolicy.RETAIN
      });
    } else {
      this.loggingBucket = new s3.Bucket(this, "loggingbucket", {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        autoDeleteObjects: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }


    // Create an Enterprise Vpc.  This uses the 'EntepriseVpc' contruct from the raindancers-network library.
    // the Construct extends the standard ec2.Vpc construct from aws-cdk-lib to provide multiple convience methods. 
    // an attribute of the Enterprise VPC is .vpc, which allows compatiblitiy with all the classes and methods in aws-cdk-lib
    // as it returns ec2.Vpc

    
    // Create some Natgateway Providers with EIP 
    // Assign some EIP's for the Nat Gateways.  Using EIP's means that the IP adress's of the
    // nat gateways will remain constant, if they are dropped and reployed.

    const eip1 = new ec2.CfnEIP(this, "EIP1forNatGateway");
    const eip2 = new ec2.CfnEIP(this, "EIP2forNatGateway");

    // in order to use the EIP's a Nat Provider is required. These
    // these however are still standard Nat Gateways.
    const natgateways = ec2.NatProvider.gateway({
      eipAllocationIds: [eip1.attrAllocationId, eip2.attrAllocationId],
    });

    // Create Outputs for the stack, This allows you to easily find the IP address's in the
    // the resulting Cloudformation Stacks, if you need them.
    new cdk.CfnOutput(this, "EIP1", { value: eip1.attrPublicIp });
    new cdk.CfnOutput(this, "EIP2", { value: eip2.attrPublicIp });


    // Define subnetGroups, for use in the enterprise VPC

    const linknet = new network.SubnetGroup(this, 'linknet', {name: 'linknet', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 26});
    const outside = new network.SubnetGroup(this, 'outside', {name: 'outside', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 28});
    const endpoints = new network.SubnetGroup(this, 'endpoints', {name: 'endpoints', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24});

    // create the VPC, using the natgateways, and subnets 
    const sharedServiceVpc = new network.EnterpriseVpc(this, "redEvpc", {

      // this  EntepriseVpc extends the standard ec2.Vpc from the cdk-lib. 
      evpc: {
        ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
        maxAzs: 2,
        natGateways: 2,
        natGatewayProvider: natgateways,
        subnetConfiguration: [
          linknet.subnet,
          outside.subnet,
          endpoints.subnet,
        ]
      }
    });

    this.vpc = sharedServiceVpc.vpc;

    
    // It is both good practice and often required by security policy to create flowlogs for the VPC which are
    // logged in a central S3 Bucket.  THis is a convience method to do this, and additionally create athena querys
    // which will provide a convient way to search the logs. 

    sharedServiceVpc.createFlowLog({
      bucket: this.loggingBucket,
      localAthenaQuerys: true,
      oneMinuteFlowLogs: true,
    });


    // the method .attachToCloudwan attaches the sharedService Enterprise VPC to the the Cloudwan
    // on a specfic segment. Remember that the cloudwan policy must allow the attachment.
    const attachmentId = sharedServiceVpc.attachToCloudWan({
      coreNetworkName: props.corenetwork,
      segmentName: props.connectToSegment
    });


    // DNS can and is commonly used as an 'out of band' data path for Malware command/control and Data Exfiltration attacks. 
    // DNS firewall provides some protection against these attacks.  This method will turn on a set of Managed Rules to help mitigate this threat. 
    // using AWS DNS Firewall.

    //sharedServiceVpc.attachAWSManagedDNSFirewallRules();

    // In this 'shared' service vpc, We add a selection of AWS service Endpoints, which
    // can be reached not only in this vpc, but the other vpcs that are attached to the cloudwan.
    // This can be helpful where a vpc needs infrequent to moderate access to a service. Consideration
    // of the balance between the cost of the endpoint vs traffic charges needs to be made. If there is heavy use of a service
    // it may be more appropriate to add an endpoint in the vpc

    sharedServiceVpc.addServiceEndpoints({
      services: [ec2.InterfaceVpcEndpointAwsService.SSM],
      subnetGroup: endpoints
    })

   

     // This method, will add Routes in the specifed Cloudwan Routing tables towards the Cloudwan Attachment for this Vpc.
    // In this network, we want all our cloudwan segments to be able to reach the internet, via our shared egress

    const tableArn = new network.CrossRegionParameterReader(this, 'tableArn', {
      region: 'us-east-1',
      parameterName: 'ExampleNet-policyTableArn'
    })

    sharedServiceVpc.addCoreRoutes({
      policyTableArn: tableArn.parameterValue(),
      segments: ["red", "green", "blue"],
      destinationCidrBlocks: ["0.0.0.0/0"],
      description: "defaultroutetoEgress",
      coreName: props.corenetwork,
      attachmentId: attachmentId,
    });



    // each subnet in each SubnetGroup, have its own routing table, ( this comes from the design of the ec2.Vpc ).
    // the .router() method provides a simple way to add add routes, in a 'route table' fashion. 
    // we need to add a route in the routing tables towards the cloudwan attachment, to that traffic can reach other vpcs on the coreWan.
    // NB. This method allows for multiple cidr ranges to be added to multiple routing tables.  While in this example we set the destination
    // as cloudwan, this .router method, allows for easy routing to TransitGateways, and Firewalls.  It is AZ aware, and will route
    // traffic so it does not cross AZ boundarys

    sharedServiceVpc.router([
      {
        subnetGroup: linknet,
        routes: [
          { cidr: '10.0.0.0/8', destination: network.Destination.CLOUDWAN, description: 'linknetAllPrivateNetworks' }
        ]
      },
      {
        subnetGroup: endpoints,
        routes: [
          { cidr: '10.0.0.0/8', destination: network.Destination.CLOUDWAN, description: 'endpointsAllPrivateNetworks' }
        ]
      },
      {
        subnetGroup: outside,
        routes: [
          { cidr: '10.0.0.0/8', destination: network.Destination.CLOUDWAN, description: 'outsideAllPrivateNetworks' }
        ]
      },
    ]);

    // MultiRegion Hybrid DNS.

    // The shared Service VPC's need to provide Route53 resolver endpoints, so that we can provide a consistent DNS resolution across the network.
    // This forms part of the infrastructure that will allow hosts in different VPC's to resolve hosts in other VPC's by name.
    sharedServiceVpc.addR53Resolvers(endpoints)

  

    // We want vpcs attached to the the Cloudwan, to be able to resolve the Zones of other vpcs. This method creates resolver rules which
    // are shared  and these can be assocated with each of the vpcs attached.
    // We create and share a rule for 'amazonaws.com' so that the private interface endpoints names can be resolved to our private endpoints.
    // we create and share a rule for 'exampleorg.cloud' which is our internal domain name.
    // this will also tag the vpc, so it can be found by spoke VPC.

    sharedServiceVpc.addCentralResolverRules(
      [
        'amazonaws.com',
        this.node.tryGetContext("domain"),
      ],
    )

  }
} 