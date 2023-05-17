import boto3
import os
ec2 = boto3.client('ec2')

def on_event(event, context):
	if event['RequestType'] == 'Create':
		return on_create_update(event)
	elif event['RequestType'] == 'Update':
		return on_create_update(event)
	elif event['RequestType'] == 'Delete':
		return on_delete(event)
	else:
		raise ValueError('Invalid request type')
	

def on_create_update(event):
	
	props = event['ResourceProperties']

	response = ec2.get_ipam_pool_allocations(
		IpamPoolId=props['IpamPoolId'],
		Filters=[
			{
				'Name': 'Cidr',
				'Values': [
					props['Cidr'],
				]
			},
		],
	)

	if len(response['IpamPoolAllocations']) != 1:
		raise ValueError('Expected exactly one IPAddress Allocation')
	
	physical_id = response['IpamPoolAllocations'][0]['IpamAllocationId']
	return { 
		'PhysicaResourceID': physical_id, 
		'Data': {
			'poolId': response['IpamPoolAllocations'][0]['IpamAllocationId']
		}
	}
	
def on_delete(event):
	print('doingNoting')