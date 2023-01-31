import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
	aws_networkmanager as networkmanager,
}
from 'aws-cdk-lib';

import * as raindancersNetwork from 'raindancers-network';


export class CloudWanCore extends cdk.Stack {

	public readonly corenetwork: raindancersNetwork.CoreNetwork
	public readonly blueSegment: raindancersNetwork.CoreNetworkSegment
	public readonly redSegment: raindancersNetwork.CoreNetworkSegment
	public readonly greenSegment: raindancersNetwork.CoreNetworkSegment

	constructor(scope: Construct, id: string, props: cdk.StackProps) {
		super(scope, id, props);

		// create the core network
		const corenetwork = new raindancersNetwork.CoreNetwork(this, 'CoreNetwork', {
			globalNetwork: new networkmanager.CfnGlobalNetwork(this, 'GlobalNetwork', {
			  description: 'exampleNet',
			}),
			policyDescription: 'example net',
			coreName: 'exampleNet',
	  
			asnRanges: [
			  '65200-65210',
			],
			insideCidrBlocks: ['10.100.0.0/22'],
	  
			edgeLocations: [
			  {
				// region1
				'location': this.node.tryGetContext('region1'),
				'asn': 65200,
				'inside-cidr-blocks': ['10.100.0.0/24'],
			  },
			  {
				// region2
				'location': this.node.tryGetContext('region2'), // getcontext
				'asn': 65201,
				'inside-cidr-blocks': ['10.100.1.0/24'],
			  }
			],
		});

		this.corenetwork = corenetwork




		// Add segments to the core network
		this.redSegment = this.corenetwork.addSegment({
			name: 'red',
			description: 'red Segment',
			isolateAttachments: false,
			requireAttachmentAcceptance: false,
		});
	
		this.blueSegment = this.corenetwork.addSegment({
			name: 'blue',
			description: 'blue Segment',
			isolateAttachments: false,
			requireAttachmentAcceptance: false,
		})
	
		this.greenSegment = this.corenetwork.addSegment({
			name: 'green',
			description: 'green Segment',
			isolateAttachments: false,
			requireAttachmentAcceptance: false,
		})


		this.redSegment.addAttachmentPolicy({
			ruleNumber: 100,
			conditionLogic: raindancersNetwork.ConditionLogic.AND,
			conditions: [
			  {
				type: raindancersNetwork.AttachmentCondition.TAG_VALUE,
				key: 'NetworkSegment',
				value: 'red',
				operator: raindancersNetwork.Operators.EQUALS,
			  },
			  {
				type: raindancersNetwork.AttachmentCondition.ACCOUNT_ID,
				value: this.node.tryGetContext('networkAccount'), //network account
				operator: raindancersNetwork.Operators.EQUALS,
			  },
			],
			action: {
			  associationMethod: raindancersNetwork.AssociationMethod.CONSTANT,
			  segment: 'red',
			},
		  });

		  this.greenSegment.addAttachmentPolicy({
			ruleNumber: 200,
			conditionLogic: raindancersNetwork.ConditionLogic.AND,
			conditions: [
			  {
				type: raindancersNetwork.AttachmentCondition.TAG_VALUE,
				key: 'NetworkSegment',
				value: 'green',
				operator: raindancersNetwork.Operators.EQUALS,
			  },
			  {
				type: raindancersNetwork.AttachmentCondition.ACCOUNT_ID,
				value: this.node.tryGetContext('networkAccount'), //network account
				operator: raindancersNetwork.Operators.EQUALS,
			  },
			],
			action: {
			  associationMethod: raindancersNetwork.AssociationMethod.CONSTANT,
			  segment: 'green',
			},
		  });

		  this.blueSegment.addAttachmentPolicy({
			ruleNumber: 300,
			conditionLogic: raindancersNetwork.ConditionLogic.AND,
			conditions: [
			  {
				type: raindancersNetwork.AttachmentCondition.TAG_VALUE,
				key: 'NetworkSegment',
				value: 'blue',
				operator: raindancersNetwork.Operators.EQUALS,
			  },
			  {
				type: raindancersNetwork.AttachmentCondition.ACCOUNT_ID,
				value: this.node.tryGetContext('networkAccount'), //network account
				operator: raindancersNetwork.Operators.EQUALS,
			  },
			],
			action: {
			  associationMethod: raindancersNetwork.AssociationMethod.CONSTANT,
			  segment: 'blue',
			},
		  });

		  this.redSegment.addSegmentAction({
			description: 'sharetocommonservices',
			action: raindancersNetwork.SegmentActionType.SHARE,
			mode: raindancersNetwork.SegmentActionMode.ATTACHMENT_ROUTE,
			shareWith: '*'
		  });

		  

		  this.blueSegment.addSegmentAction({
			description: 'sharetocommonservices',
			action: raindancersNetwork.SegmentActionType.SHARE,
			mode: raindancersNetwork.SegmentActionMode.ATTACHMENT_ROUTE,
			shareWith: [this.redSegment.segmentName]
		  });

		  this.greenSegment.addSegmentAction({
			description: 'sharetocommonservices',
			action: raindancersNetwork.SegmentActionType.SHARE,
			mode: raindancersNetwork.SegmentActionMode.ATTACHMENT_ROUTE,
			shareWith: [this.redSegment.segmentName]
		  });
		
				this.corenetwork.updatePolicy();

		// share the core network with the organisation
		// if (!(this.node.tryGetContext('sharingToPrincipal'))){
		// 	this.corenetwork.share({
		// 		allowExternalPrincipals: false,
		// 		principals: this.node.tryGetContext('sharingToPrincipal')
		// 	}); 
		// }
	}
}