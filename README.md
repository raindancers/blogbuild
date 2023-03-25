# Sample Cloudwan Project


### Prerequites

- CDK is installed locally
- An AWS network account is avaiable
- CDK Bootstrapping is done for the regions us-east-1, and the regions you want to deploy your cloudwan to.
- Credentials that will allow you to assume the cdk deployment roles


To create a sample Cloudwan project, clone this repo locally.

1. Open and Edit `\cdk.json`.  Modify lines 20-25 to reflect the regions, and account that you want to deploy to.  Optionally you can share your cloudwan if you want to share cloudwan via RAM.  In the following example, CDK will build a project that creats a cloud wan, in Singapore and Sydney, in account '12345678900', and will share it to the organisation o-123456789

```json
"orgId": "o-123345567",
"networkAccount": "1234567890",
"region1": "ap-southeast-2",
"region2": "ap-southeast-1"
```

2. Install the project dependancies from package.json

`npm install`


3. Synth the project
`cdk synth --profile <networkaccountprofile>`

4. Deploy the stacks. ( this is a semi manual deployment process, without CI/CD)

- 4.1 First deploy the CoreWan, and let it complete. This could take as long as fifteen minutes
  
  `cdk deploy CloudwanCore`

- 4.2 Deploy the VPC stacks, 

  `cdk deploy RegionOneVPC`

  `cdk deploy RegionTwoVPC

