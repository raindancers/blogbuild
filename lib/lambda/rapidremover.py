import boto3
import os

# this operation needs to occur on the region where the ipam lives.
ec2 = boto3.client('ec2',  region_name='us-east-1')

def on_event(event, context):
	if event['RequestType'] == 'Create':
		return on_create(event)
	elif event['RequestType'] == 'Update':
		return on_update(event)
	elif event['RequestType'] == 'Delete':
		return on_delete(event)
	else:
		raise ValueError('Invalid request type')


def on_create(event):

	props = event['ResourceProperties']
	print('creating')
	

def on_update(event):
	print('updating')

def on_delete(event):

	props = event['ResourceProperties']

	# change the allocaiton to no monitoring.
	print('deleting')
	ipam_resource = ec2.modify_ipam_resource_cidr(
		ResourceId= props['ResourceId'],
		ResourceCidr=props['ResourceCidr'],
		ResourceRegion=props['ResourceRegion'],
		CurrentIpamScopeId=props['CurrentIpamScopeId'],    # this is getting the us-east-1 scope.   Needs the local scope?
		Monitored= False
	)	

	# delete the allocation.
	response = ec2.deprovision_ipam_pool_cidr(
		IpamPoolId = ipam_resource['IpamResourceCidr']['IpamPoolId'],
		Cidr = props.vpc.vpcCidrBlock
	)
