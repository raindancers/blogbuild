import boto3
import os
ec2 = boto3.client('ec2')

def on_event(event, context):

	description = f"{os.environ.get('DESCRIPTION_SEARCH')}{os.environ.get('AWS_REGION')}"
	print(description)

	response = ec2.describe_ipam_pools()

	pool = next((pool for pool in response["IpamPools"] if pool["Description"] == description ), None)
	
	if pool is None:
		raise ValueError("Pool not found")
	

	physical_id = pool['IpamPoolId']
	return { 
		'PhysicaResourceID': physical_id, 
		'Data': {
			'poolId': pool['IpamPoolId']
		}
	}