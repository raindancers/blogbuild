import * as cdk from 'aws-cdk-lib';
import { CloudWanCore } from '../lib/core'
import { RegionOne } from '../lib/region1'
import { RegionTwo } from '../lib/region2'

const app = new cdk.App();

// the cloudwan core should be deployed in us-east-1
const core = new CloudWanCore(app, 'CloudwanCore', {
  env: { 
	account: app.node.tryGetContext('networkAccount'),
	region: 'us-east-1' }
});

new RegionOne(app, 'RegionOneVPC', {
	env: { 
		account: app.node.tryGetContext('networkAccount'),
		region:  app.node.tryGetContext('region1')
	},
	corenetwork: core.corenetwork,
	redSegment: core.redSegment,
	greenSegment: core.greenSegment,
	blueSegment: core.blueSegment
});

new RegionTwo(app, 'RegionTwoVPC', {
	env: { 
		account: app.node.tryGetContext('networkAccount'),
		region:  app.node.tryGetContext('region2')
	},
	corenetwork: core.corenetwork,
	greenSegment: core.greenSegment,
	blueSegment: core.blueSegment
});
  
