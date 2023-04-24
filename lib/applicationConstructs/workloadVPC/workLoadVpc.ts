import * as constructs from "constructs";
import { 
  aws_ec2 as ec2,
  aws_s3 as s3
} from 'aws-cdk-lib';

import { WebServer } from "../webserver/webServer";
import * as network from "raindancers-network";

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
  readonly corenetwork: string;
  /**
   * The coreWan Segment that the vpc will be attached to
   */
  readonly connectToSegment: string;
  /**
   * A bucket for Logging
   */
  readonly loggingBucket: s3.Bucket;
  /**
   * region for creating the domain
   */
  readonly region: string;
}

/**
 * This will create a VPC, that has no direct egress to the internet. 
 * This Vpc will span two Availablity Zones.
 */
export class WorkLoadVpc extends constructs.Construct {
  constructor(scope: constructs.Construct, id: string, props: WorkLoadVpcProps) {
    super(scope, id);

    // define a subnetgroup to use for placing the connections to 
    // the cloudwan.  The subnetGroup creates one subnet per AZ. Each Subnet
    // has its own routing table associated with it. 
    const linknet = new network.SubnetGroup(this, "linknet", {
      name: "linknet",
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: 28,
    });

    // subnets for the internal webservers.
    const workloads = new network.SubnetGroup(this, "workloads", {
      name: "workloads",
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: 26,
    });

    // create the vpc.
    const vpc = new network.EnterpriseVpc(this, "WorkloadEvpc", {
      evpc: {
        ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
        maxAzs: 2,
        natGateways: 0,
        subnetConfiguration: [
          linknet.subnet,
          workloads.subnet],
      },
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

    /**
     * the method .attachToCloudwan attaches the sharedService Enterprise VPC to the the Cloudwan
     * on a specfic segment. Remember that the cloudwan policy must allow the attachment.
     */
    vpc.attachToCloudWan({
      coreNetworkName: props.corenetwork,
      segmentName: props.connectToSegment,
    });

    /**
     * the .router() method provides an easy to understand interface for creating
     * routes that seem familar to networking people
     * Because this vpc only has a cloudwan gateway, a single default route is
     * all that is required, for each subnets routing table.
     */
    vpc.router([
      {
        subnetGroup: linknet,
        routes: [{cidr: "0.0.0.0/0",destination: network.Destination.CLOUDWAN,description: "Default Route"}],
      },
      {
        subnetGroup: workloads,
        routes: [{cidr: "0.0.0.0/0", destination: network.Destination.CLOUDWAN, description: "Default Route"}],
      },
    ]);

    /** This will associate the the routeresolver rules that where created in the shared services stack.
     * This will direct DNS querys for the listed domains towards the route53 inbound resolvers in the shared services
     * vpc.  in our case this will be our internal domain 'exampleorg.cloud' and the amazonaws.com domain for endpoint services.
     */
    vpc.associateSharedResolverRules(
      [
        "exampleorg.cloud",
        "amazonaws.com"
      ]
    );

    /**
     * Create a Local R53 Zone for this vpc, and additionally associate it with the central resolver vpcs, to allow
     * cross vpc resolution across the cloudwan.
     */
    const zone = vpc.createAndAttachR53EnterprizeZone({
      domainname: `${props.region}.${props.vpcName}.${this.node.tryGetContext("domain")}`,
      hubVpcs: [
        { region: this.node.tryGetContext("region1") },
        { region: this.node.tryGetContext("region2") },
      ],
    });

    /**
     * Create a Ec2 Instance that in the workloads segment
     *
     */
    new WebServer(this, "Webserver", {
      vpc: vpc.vpc,
      subnets: { subnetGroupName: "workloads" },
      r53zone: zone,
      hostname: `${props.vpcName}`,
    });
  }
}
