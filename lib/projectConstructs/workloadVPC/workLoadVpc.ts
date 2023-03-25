import * as cdk from "aws-cdk-lib";
import * as constructs from "constructs";
import { aws_ec2 as ec2, aws_s3 as s3 } from "aws-cdk-lib";
import { WebServer } from "../webserver/webServer";
import * as network from "raindancers-network";
//import { EnterpriseZone } from '../enterprizeZone/enterpriseZone'

export interface WorkLoadVpcProps {
  /**
   * Name for the vpc
   */
  readonly vpcName: string;
  /**
   * Cidr range for the VPC
   */
  readonly vpcCidr: string;
  /**
   * The cloudwan Corenetwork which the vpc will be attached to
   */
  readonly corenetwork: network.CoreNetwork;
  /**
   * The coreWan Segment that the vpc will be attached to
   */
  readonly connectToSegment: network.CoreNetworkSegment;
  /**
   * A bucket for Logging
   */
  readonly loggingBucket: s3.Bucket;
  /**
   * The sharedService account details, and role to assume
   */
  readonly centralAccount: network.CentralAccount;
  /**
   * Vpcs where to associate this Vpcs Private Zone with.
   */
  readonly remoteVpc: network.RemoteVpc[];
  /**
   * region for creating the domain
   */
  readonly region: string;
}

/**
 * This will create a VPC, that has no Egress to the internet, of its own.  It will contain some workloads
 * This Vpc will span two Availablity Zones.
 */
export class WorkLoadVpc extends constructs.Construct {
  constructor(
    scope: constructs.Construct,
    id: string,
    props: WorkLoadVpcProps
  ) {
    super(scope, id);

    /**  this vpc is the standard ec2.Vpc from the cdk-lib.  This allows you to form the
     * vpc in many different ways.  For example you could use Ipam to provide the address space
     * your self.  You could also import the Vpc.
     * https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
     */
    //const vpc = new network.EnterpriseVpc(this, 'GreenEvpc', {
    const vpc = new network.EnterpriseVpc(this, "GreenEvpc", {
      vpc: new ec2.Vpc(this, `${props.vpcName}VPC`, {
        ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
        maxAzs: 2,
        natGateways: 0,
        subnetConfiguration: [
          // the linknet subnet is where the endpoints for connection to Cloudwan will be placed.
          // by default the .attachmentToCloudwan method will look for the subnetGroupName 'linknet'.
          // If you rename this, ensure you provide the alternative name in the method
          {
            name: "linknet",
            cidrMask: 28,
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          },
          // this subnet group will contain a some workloads
          {
            name: "workloads",
            cidrMask: 24,
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          },
        ],
      }),
    });

    /**
     * the method .attachToCloudwan attaches the sharedService Enterprise VPC to the the Cloudwan
     * on a specfic segment. Remember that the cloudwan policy must allow the attachment.
     */
    vpc.attachToCloudWan({
      coreNetworkName: props.corenetwork.coreName,
      segmentName: props.connectToSegment.segmentName,
    });

    /**  It is both good practice and often required by security policy to create flowlogs for the VPC which are
     * logged in a central S3 Bucket.  THis is a convience method to do this, and additionally create athena querys
     * which will provide a convient way to search the logs.
     */

    vpc.createFlowLog({
      bucket: props.loggingBucket,
      localAthenaQuerys: true,
      oneMinuteFlowLogs: true,
    });

    /** each subnet which is is member of the VPC, has its own routing table. ( this is the design of the ec2.Vpc ).
     * we need to add a route in the routing tables towards the cloudwan attachment, to that traffic can reach other vpcs.
     * Because this is the only path out of the VPC, we can simply add a default route.
     */

    vpc.addRoutes({
      cidr: ["0.0.0.0/0"],
      description: "defaultroute",
      subnetGroups: ["workloads"],
      destination: network.Destination.CLOUDWAN,
      cloudwanName: props.corenetwork.coreName,
    });

    /** This will associate the the routeresolver rules that where created in the shared services stack.
     * This will direct DNS querys for the listed domains towards the route53 inbound resolvers in the shared services
     * vpc.  in our case this will be our internal domain 'multicolour.cloud' and the amazonaws.com domain for endpoint services.
     */
    new network.AssociateSharedResolverRule(this, "r3rules", {
      domainNames: [
        'multicolour.cloud',
         `${props.region}.amazonaws.com`],
      vpc: vpc.vpc,
    });

    /**
     * Create a Local R53 Zone for this vpc, and additionally associate it with the central resolver vpcs, to allow
     * cross vpc resolution across the cloudwan.
     */
    const vpcZone = new network.EnterpriseZone(this, "EnterpriseR53Zone", {
      enterpriseDomainName: `${cdk.Aws.REGION}.${props.vpcName}.multicolour.cloud`,
      localVpc: vpc.vpc,
      remoteVpc: props.remoteVpc,
      centralAccount: props.centralAccount,
    });

    /**
     * Create a Ec2 Instance that in the workloads segment
     *
     */
    new WebServer(this, "Webserver", {
      vpc: vpc.vpc,
      subnets: { subnetGroupName: "workloads" },
      r53zone: vpcZone.privateZone,
      hostname: `${props.vpcName}`,
    });
  }
}
