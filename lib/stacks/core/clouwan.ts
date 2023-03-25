import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_networkmanager as networkmanager,
} from "aws-cdk-lib";
import * as raindancersNetwork from "raindancers-network";

export class CloudWanCore extends cdk.Stack {
  public readonly corenetwork: raindancersNetwork.CoreNetwork;
  public readonly blueSegment: raindancersNetwork.CoreNetworkSegment;
  public readonly redSegment: raindancersNetwork.CoreNetworkSegment;
  public readonly greenSegment: raindancersNetwork.CoreNetworkSegment;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // create the core network
    this.corenetwork = new raindancersNetwork.CoreNetwork(this, "CoreNetwork", {
      globalNetwork: new networkmanager.CfnGlobalNetwork(
        this,
        "GlobalNetwork",
        {
          description: "exampleNet",
        }
      ),
      policyDescription: "example net",
      coreName: "exampleNet",

      asnRanges: ["65200-65210"],
      insideCidrBlocks: ["10.100.0.0/22"],

      edgeLocations: [
        {
          // region1
          location: this.node.tryGetContext("region1"),
          asn: 65200,
          "inside-cidr-blocks": ["10.100.0.0/24"],
        },
        {
          // region2
          location: this.node.tryGetContext("region2"), // getcontext
          asn: 65201,
          "inside-cidr-blocks": ["10.100.1.0/24"],
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
