import * as cdk from 'aws-cdk-lib';
import { CloudWanCore } from '../lib/stacks/core/core'
import { RegionOne } from '../lib/stacks/regionOne/region1workloads'
import { RegionTwo } from '../lib/stacks/regionTwo/region2workloads'
import { RegionOneCentralVpc } from '../lib/stacks/regionOne/region1egress';
import { RegionTwoCentralVpc } from '../lib/stacks/regionTwo/region2egress';

const app = new cdk.App();

/**
 *  Note. the cloudwan core should be deployed in us-east-1, even though the the service is 
 * a global service based in us-west-2.  This is so, that it can be shared using RAM.
 * If its deployed in other regions, RAM won't work. 
**/
const core = new CloudWanCore(app, 'CloudwanCore', {
  env: { 
	account: app.node.tryGetContext('networkAccount'),
	region: 'us-east-1' },
	crossRegionReferences: true
});

const regionOneEgress = new RegionOneCentralVpc(app, 'regionOneEgress', {
	env: { 
		account: app.node.tryGetContext('networkAccount'),
		region:  app.node.tryGetContext('region1')
	},
	corenetwork: core.corenetwork,
	redSegment: core.redSegment,
	crossRegionReferences: true
})

const regionTwoEgress = new RegionTwoCentralVpc(app, 'regionThisEgress', {
	env: { 
		account: app.node.tryGetContext('networkAccount'),
		region:  app.node.tryGetContext('region2')
	},
	corenetwork: core.corenetwork,
	redSegment: core.redSegment,
	crossRegionReferences: true,
})

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
			vpcId: regionTwoEgress.centralVpc.vpcId,
			vpcRegion: app.node.tryGetContext('region2')
		}
	],
	crossRegionReferences: true
});

// new RegionTwo(app, 'RegionTwoVPC', {
// 	env: { 
// 		account: app.node.tryGetContext('networkAccount'),
// 		region:  app.node.tryGetContext('region2')
// 	},
// 	corenetwork: core.corenetwork,
// 	redSegment: core.redSegment,
// 	greenSegment: core.greenSegment,
// 	blueSegment: core.blueSegment,
// 	loggingbucket: core.loggingBucket,
// 	centralAccount: app.node.tryGetContext('networkAccount'),
// 	remoteVpc: [
// 		{
// 			vpcId: regionOneEgress.centralVpc.vpcId,
// 			vpcRegion: app.node.tryGetContext('region1')
// 		},
// 		{
// 			vpcId: regionTwoEgress.centralVpc.vpcId,
// 			vpcRegion: app.node.tryGetContext('region2')
// 		}
// 	]
// });
  
