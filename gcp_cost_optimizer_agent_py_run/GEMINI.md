## GCP IAM / PolicyLens
- I do not not use custom IAM roles.
- I prefer using V1 IAM policies, not v3.
- Role bindings must be placed in ./terraform/iam.tf

- **IMPORTANT** Do **not** generate any artifact after scaning code and generating terraform policies. Display the generated Terraform policy inline in the chat.
