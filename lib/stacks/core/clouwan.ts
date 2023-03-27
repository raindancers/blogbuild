import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_networkmanager as networkmanager,
} from "aws-cdk-lib";
import * as raindancersNetwork from "raindancers-network";

/**
 * Creates a Global Network which contains a Cloudwan Core Network
 */
export class CloudWanCore extends cdk.Stack {
  /**
   * The corenetwork that is created as part of this cloudwan
   */
  public readonly corenetwork: raindancersNetwork.CoreNetwork;
  /**
   *  The blueSegment of the coreWan
   */
  public readonly blueSegment: raindancersNetwork.CoreNetworkSegment;
  /**
   * the red Segment of the CoreWan
   */
  public readonly redSegment: raindancersNetwork.CoreNetworkSegment;
  /**
   * the greenSegment of the CoreWan
   */
  public readonly greenSegment: raindancersNetwork.CoreNetworkSegment;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // create the core network
    this.corenetwork = new raindancersNetwork.CoreNetwork(this, "CoreNetwork", {
    
      // The core network is included inside a Global network. 
      globalNetwork: new networkmanager.CfnGlobalNetwork(
        this,
        "GlobalNetwork",
        {
          description: "exampleNet",
        }
      ),
      policyDescription: "example net",
      coreName: "exampleNet",
      // these asns are used to create the peering between Core Network Edge Locations (CNE). 
      // the range size should be at least as large as the number of CNE 
      asnRanges: ["65200-65210"],
      // This Cidr Range is used to number the links that will be created between CNE.This is
      // The ranges provided for each of the CNE's below must be subnets within this range
      insideCidrBlocks: ["10.1.0.0/22"],

      // A list of edge locations.  
      edgeLocations: [
        {
          // region
          location: this.node.tryGetContext("region1"),
          asn: 65200,
          "inside-cidr-blocks": ["10.1.0.0/24"],
        },
        {
          // region2
          location: this.node.tryGetContext("region2"), // getcontext
          asn: 65201,
          "inside-cidr-blocks": ["10.1.1.0/24"],
        },
      ],
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
  }
}
