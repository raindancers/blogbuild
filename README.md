# Deploying global Cloud WAN using AWS-CDK #

A complete global network that spans multiple regions is a complex and potentially overwhelming problem,  if you attempt to consider all the details together.    By using  programmatic Infrastructure as code (IAC) and the concepts of decomposition and abstraction, we  take this complex problem and create a series of smaller parts that are easier to understand, program, and maintain.   Considerable operational improvements are obtained, using IAC;  full version control, audit and governance capability, pre and post deployment testing and  automated infrastructure deployment and management. These are transformational in an organisation. 

## exampleorg.cloud - A simplistic, fictitious, global organisation.  ##
exampleorg needs to deploy a global network to span two regions; Singapore and Sydney. 
- It needs to  maintain separation between different parts of its network for security purposes.
- The green segment requires internet access, but the Blue segment must not.  The red segment must be able to reach all parts of the network. 
- exampleorg solution architects have decided that AWS CloudWan will be a good fit to meet these requirements, and produced this diagram for engineering.

![MulticolorDiagram](./docs/images/multicolour.jpg)


exampleorg has an IAC first policy, and its engineering team uses CDK with Typescript.


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
Good *as code* allows the *code* serves two purposes. The obvious one is that it is what 'builds' our infrastructure. The perhaps less obvious purpose is that it should provide the detailed documentation of what is built, as it captures *everything*.    Our example code demonstrates this with jdoc styled commetns that provide detailed information. about how the constructs and stacks work as well as the construct props, and propertys that are exposed. 

### The Stacks 

#### The cloudWan Core Stack. ###

AWS Cloud WAN, is a sophisticated network service that makes building an elastic multi region network with sophisticated policy reasonably simple, and on demand.  It is comprised of a number of configurable elements that we will need to deploy.  The  ‘interface’ that is provided natively by AWS for the service, are APIs which  expect an entire JSON document that describes all of these elements. While it is possible to build CloudWan this way,  there is considerable benefit in building a construct that presents Cloudwan as individual objects,  with appropriate methods and properties.   In the cloudwan Core Stack, we will use the raindancers-network library, which provides this feature.

Embed: [cloudwan.ts](./lib/stacks/core/clouwan.ts) 

#### The egress stacks

As previously identifyed, the egrees stacks for the two regions are nearly identical, giving us the opportunity to only write the code once using constructs. 

The stacks [regionOneEgress.ts](lib/stacks/regionOne/regionOneEgress.ts) and [regionTwoEgress.ts](lib/stacks/regionOne/regionTwoEgress.ts)instantiate an instance of the application specific construct [sharedServiceVpc.ts](lib/applicaitonConstructs/sharedServiceVPC/.

The construct creates
- A S3 bucket for logging VPC traffic, which will be used on a regional level for all the vpcs
- A VPC that has an Internet Gateway, and the NatGateways and subnets are defined. 
- Routes for the VPC and Cloudwan
- DNS Zones and Route Resolver Rules. 

Embed SharedServiceVpc


#### The workload stacks

Similar to the egress Stacks, the workload stacks are all very similar and using constructs is appropriate.  The stacks will create an instance of `WorkloadVpc` which will contain all the resources. The construct 'WebServer' is nested inside this construct.

THe construct will create 
- A VPC, with logging pointed to the logging buckets created in the egress stacks
- A Route53 Internal Zone that is assocated with the VPC
- An Assocation of the shared route resolver rules with the VPC.
- An EC2 Instance that is operating as a Web Server. 

There are many familar parts to this construct, which were used in the creation of the sharedService construct.   

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