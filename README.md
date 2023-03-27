# Deploying global Cloud WAN using AWS-CDK #

A complete global network that spans multiple regions is a complex and potentially overwhelming problem,  if you attempt to consider all the details together.    By using  programmatic Infrastructure as code (IAC) and the concepts of decomposition and abstraction, we  take this complex problem and create a series of smaller parts that are easier to understand, program, and maintain.   Considerable operational improvements are obtained, using IAC;  full version control, audit and governance capability, pre and post deployment testing and  automated infrastructure deployment and management. These are transformational in an organisation. 

## Multicolour.cloud - A simplistic, fictitious, global organisation.  ##
Multicolour needs to deploy a global network to span two regions; Singapore and Sydney. 
It needs to  maintain separation between different parts of its network for security purposes, however all parts of the network need internet connectivity.  The instances in the red segment shoudl be able to reach the blue and green segments.  Multicolour solution architects have decided that AWS CloudWan will be a good fit to meet these requirements, and produced this diagram for engineering.

![MulticolorDiagram](./docs/images/multicolour.jpg)


Multicolour has an IAC first policy, and its engineering team uses CDK with Typescript.


### Breaking Down ( decomposing ) the problem with constructs: ##

From the diagram,  three major parts that we can break the problem into are;


- The cloudwan
- The workloads
- The Internet Egress.

CDK creates cloudformation [*stacks*](https://docs.aws.amazon.com/cdk/v2/guide/stacks.html). Stacks provide a way to manage related resources as a single unit in an environment.  To solve our problem we need 7 stacks.  A stack for the cloudwan, four stacks for the workloads and two stacks that contain the egress. Looking at  the four workload stacks we can see that these are essentially the same as each other, with just a few properties which make them unique.  The same applies to the egress.    What if we could just write the code for each of these problems once? And just provide the differing parameters for each instance of the stack. We can, using [*constructs*](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html).

CDK constructs are the basic building blocks of a CDK [*application*](https://docs.aws.amazon.com/cdk/v2/guide/apps.html), and represent and encapsulate what is needed to create the component.  Constructs map to classes in an object oriented language, so they are reusable, nestable and have methods to take actions on the instances of the class.   They also abstract away  un-needed detail, making code significantly understandable.

Constructs are categorised Layer1 to Layer 3;

- L1 constructs map 1:1 to a cloudformation resource type, 
- L2  have higher-level, intent-based APIs
- L3 are akin to ‘patterns’ which involve multiple resources. 


In the solution that we present to solve the problem, we use all of these layers.  Some of the constructs we use are public and come from the ```aws-cdk-lib library```, others come from the ```raindancers-network``` construct which is published to [constructs.dev](https://constructs.dev), and some of the constructs are private to the project itself.


## Everything as code ##
Good *as code* allows the *code* serves two purposes. The obvious one is that it is what 'builds' our infrastructure. The perhaps less obvious purpose is that it should provide the detailed documentation of what is built, as it captures *everything*.    


### The Stacks 

#### The cloudWan Core Stack. ###

AWS Cloud WAN, is a sophisticated network service that makes building an elastic multi region network with sophisticated policy reasonably simple, and on demand.  It is comprised of a number of configurable elements that we will need to deploy.  The  ‘interface’ that is provided natively by AWS for the service, are APIs which  expect an entire JSON document that describes all of these elements. While it is possible to build CloudWan this way,  there is considerable benefit in building a construct that presents Cloudwan as individual objects,  with appropriate methods and properties.   In the cloudwan Core Stack, we will use the raindancers-network library, which provides this feature.

[cloudwan.ts](./lib/stacks/core/clouwan.ts) defines the CloudWan that gets built.   

The class `CloudWanCore` defines a Global Network, in which our corenetwork will reside, we need to provide a few parameters for the core network, such as names, descriptions, asnRanges, and inside-cidr-ranges.  These follow the documented [`core-network-configuration`](https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-policies-json.html) from the cloudwan documentation. The 'reach' of the cloudwan, is defined by adding regions to the cloudwan in the edgeLocations parameter. In this example, the regions are defined in cdk.json, so they can be easily modifyed in one place. 

CoreWan Segments are added to the Corewan using the method `.addsegment()`.  Red, Blue and Green Segments are added.  the .addsegment() method returns an instance of `CoreNetworkSegment`

Each Segment needs an attachment policy. An attachment policy determines what is allowed to attach to the cloudwan. In this example, we use the .addSimpleAttachmentPolicy() method which will allow a vpc to be attached if its attachment tag follows this format. 

```
{
  'Key': 'NetworkSegment',
  'Value': '<segmentnname>
} 
```

Segments also have actions. The .addSimpleShareAction() method shares the routes in one segment with another segment.  The toutes in the red segment shoudl be shared to everything.  The routes in the green segment are shared with the red segment and the routes in the blue are shared with teh red. 

Finally we need to use the .update policy method on the corenetwork.   This method, creates resources that bridge the gap between the singular JSON document that the API expects, and our code objects. 

The stack defines properties,  `corenetwork`, `bluesegment`, `redSegment` and `greensegment`, as an abstraction. The other stacks in the applicaiton will use these properties. Using properties rather than hard coded values, is not only good coding practice, it makes for efficent use of time, when change is required. 





#### The egress stacks




#### The workload stacks





## Deployment ##

### Prerequites

- CDK is installed ( Installation Instructions https://docs.aws.amazon.com/cdk/v2/guide/home.html  )
- An AWS network account is avaiable for you to use. 
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

### Customization ###