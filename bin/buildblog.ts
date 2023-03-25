import * as cdk from 'aws-cdk-lib';
import { CloudWanCore } from '../lib/stacks/core/clouwan'
import { RegionOne } from '../lib/stacks/regionOne/regionTwoWorkLoads'
import { RegionTwo } from '../lib/stacks/regionTwo/regionTwoWorkloads'
import { RegionOneCentralVpc } from '../lib/stacks/regionOne/regionOneEgress';
import { RegionTwoCentralVpc } from '../lib/stacks/regionTwo/regionTwoEgress';

const app = new cdk.App();

/**
 *  Create a Stack that creates a CloudWan, that spans two regions, 
 * with three segments, red, green, blue
**/
const core = new CloudWanCore(app, 'CloudwanCore', {
  env: { 
	account: app.node.tryGetContext('networkAccount'),
	region: 'us-east-1' },
	crossRegionReferences: true
});

/**
 * Create a Central Service VPC in Region One, and join it to the redSegment
 */
const regionOneEgress = new RegionOneCentralVpc(app, 'regionOneEgress', {
	env: { 
		account: app.node.tryGetContext('networkAccount'),
		region:  app.node.tryGetContext('region1')
	},
	corenetwork: core.corenetwork,
	redSegment: core.redSegment,
	crossRegionReferences: true
})
// Create a central Service VPC in Region Two, and join it to the redSegment
const regionTwoEgress = new RegionTwoCentralVpc(app, 'regionThisEgress', {
	env: { 
		account: app.node.tryGetContext('networkAccount'),
		region:  app.node.tryGetContext('region2')
	},
	corenetwork: core.corenetwork,
	redSegment: core.redSegment,
	crossRegionReferences: true,
})

// Create VPC's in RegionOne, and add workloads to them.
new RegionOne(app, 'RegionOneVPC', {
	env: { 
		account: app.node.tryGetContext('networkAccount'),
		region:  app.node.tryGetContext('region1')
	},
	corenetwork: core.corenetwork,
	greenSegment: core.greenSegment,
	blueSegment: core.blueSegment,
	loggingbucket: regionOneEgress.loggingBucket,
	centralAccount: {
		accountId: app.node.tryGetContext('networkAccount'),
		roleArn: regionOneEgress.resolverRole.roleArn
	},
	remoteVpc: [
		{
			vpcId: regionOneEgress.centralVpcId,
			vpcRegion: app.node.tryGetContext('region1')
		},
		{
			vpcId: regionTwoEgress.centralVpcId,
			vpcRegion: app.node.tryGetContext('region2')
		}
	],
	crossRegionReferences: true
});


new RegionTwo(app, 'RegionTwoVPC', {
	env: { 
		account: app.node.tryGetContext('networkAccount'),
		region:  app.node.tryGetContext('region2')
	},
	corenetwork: core.corenetwork,
	greenSegment: core.greenSegment,
	blueSegment: core.blueSegment,
	loggingbucket: regionTwoEgress.loggingBucket,
	centralAccount: app.node.tryGetContext('networkAccount'),
	remoteVpc: [
		{
			vpcId: regionOneEgress.centralVpcId,
			vpcRegion: app.node.tryGetContext('region1')
		},
		{
			vpcId: regionTwoEgress.centralVpcId,
			vpcRegion: app.node.tryGetContext('region2')
		}
	]
});
  
