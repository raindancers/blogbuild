import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_networkmanager as networkmanager,
} from "aws-cdk-lib";
import * as network from "raindancers-network";
import { AwsRegions } from "raindancers-network";

export interface EdgeLocation{
  location: AwsRegions
}

export interface CloudWanCoreProps extends cdk.StackProps {
  
  cneRegions: AwsRegions[],
  coreName: string;
  asnRanges: string[],
  insideCidrBlocks: string[]
  
}
/**
 * Creates a Global Network which contains a Cloudwan Core Network
 * The class `CloudWanCore` defines a Global Network, in which the corenetwork is created. Parameters for the core network,
 * such as names, descriptions, asnRanges, and inside-cidr-ranges.  These follow the documented [`core-network-configuration`](https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-policies-json.html)
 * from the cloudwan documentation. The 'reach' of the cloudwan, is defined by adding regions to the cloudwan in the edgeLocations parameter.
 * In this example, the regions are defined in cdk.json, so they can be easily modifyed in one place. 
 * CoreWan Segments are added to the Corewan using the method `.addsegment()`.  Red, Blue and Green Segments are added.  the .addsegment() method returns an instance of `CoreNetworkSegment`
 * Each Segment needs an attachment policy. An attachment policy determines what is allowed to attach to the cloudwan. In this example, we use the .addSimpleAttachmentPolicy() method.
 * 
 * Segments also have actions. The .addSimpleShareAction() method shares the routes in one segment with another segment.
 * The routes in the red segment shoudl be shared to everything. 
 *  The routes in the green segment are shared with the red segment and the routes in the blue are shared with the red. 
 * 
 * Finally the .updatepolicy() method is used on the corenetwork. 
 * This method, creates resources that bridge the gap between the singular JSON document that the API expects, and our code objects. 
 * 
 */
export class CloudWanCore extends cdk.Stack {
  /**
   * The corenetwork that is created as part of this cloudwan. 
   */
  public readonly corenetwork: network.CoreNetwork;
  /**
   *  The blueSegment of the coreWan
   */
  public readonly blueSegment: network.CoreNetworkSegment;
  /**
   * the red Segment of the CoreWan
   */
  public readonly redSegment: network.CoreNetworkSegment;
  /**
   * the greenSegment of the CoreWan
   */
  public readonly greenSegment: network.CoreNetworkSegment;
  /**
   * 
   */
  public readonly policyTableArn: string;
  public readonly coreNetworkName: string;

  constructor(scope: Construct, id: string, props: CloudWanCoreProps) {
    super(scope, id, props);

    const edgeLocations: EdgeLocation[] = []; 
    props.cneRegions.forEach((region) => {
        edgeLocations.push({location: region})
    })

    // create the core network
    this.corenetwork = new network.CoreNetwork(this, "CoreNetwork", {

      

      // The core network is included inside a Global network. 
      globalNetwork: new networkmanager.CfnGlobalNetwork(
        this,
        "GlobalNetwork",
        {
          description: "exampleNet",
        }
      ),
      policyDescription: "example net",
      coreName: props.coreName, 
      // these asns are used to create the peering between Core Network Edge Locations (CNE). 
      // the range size should be at least as large as the number of CNE 
      asnRanges: props.asnRanges,
      // This Cidr Range is used to number the links that will be created between CNE.This is
      // The ranges provided for each of the CNE's below must be subnets within this range
      insideCidrBlocks: props.insideCidrBlocks,

      // A list of edge locations.  
      edgeLocations: edgeLocations,
      // This is is an OptOut flag, which will not include backupVaults, and will S3 Buckets to be destroyed 
      // when the Stacks/App are removed destroyed.  It is ** HIGHLY ** recommended that for a production environment
      // that this property is removed. 
      nonProduction: true,
    });

    // Add segments to the core network
    this.redSegment = this.corenetwork.addSegment({
      name: "red",
      description: "red Segment",
      isolateAttachments: false,
      requireAttachmentAcceptance: false,
    });

    this.blueSegment = this.corenetwork.addSegment({
      name: "blue",
      description: "blue Segment",
      isolateAttachments: false,
      requireAttachmentAcceptance: false,
    });

    this.greenSegment = this.corenetwork.addSegment({
      name: "green",
      description: "green Segment",
      isolateAttachments: false,
      requireAttachmentAcceptance: false,
    });

    // add attachment policys by Tag to the segments
    this.redSegment.addSimpleAttachmentPolicy({
      ruleNumber: 100,
    });
    this.greenSegment.addSimpleAttachmentPolicy({
      ruleNumber: 200,
    });
    this.blueSegment.addSimpleAttachmentPolicy({
      ruleNumber: 300,
    });

    // add sharing actions to the segments
    this.redSegment.addSimpleShareAction({
      description: "Share the red segment with everything",
      shareWith: "*",
    });
    this.greenSegment.addSimpleShareAction({
      description: "Share the green segment with the redSegment",
      shareWith: [this.redSegment],
    });
    this.blueSegment.addSimpleShareAction({
      description: "Share the blue segment with the redSegment",
      shareWith: [this.redSegment],
    });


    this.corenetwork.updatePolicy();
    this.policyTableArn = this.corenetwork.policyTable.tableArn;
    this.coreNetworkName = props.coreName;
    
  }
}