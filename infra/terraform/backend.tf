# Terraform Backend Configuration
# S3 버킷과 DynamoDB 테이블은 수동으로 미리 생성해야 합니다.
#
# S3 버킷 생성:
# aws s3api create-bucket --bucket devops-automation-tfstate --region ap-northeast-2 --create-bucket-configuration LocationConstraint=ap-northeast-2
# aws s3api put-bucket-versioning --bucket devops-automation-tfstate --versioning-configuration Status=Enabled
# aws s3api put-bucket-encryption --bucket devops-automation-tfstate --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#
# DynamoDB 테이블 생성:
# aws dynamodb create-table --table-name devops-automation-tfstate-lock --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST --region ap-northeast-2

terraform {
  backend "s3" {
    bucket         = "devops-automation-tfstate"
    key            = "terraform.tfstate"
    region         = "ap-northeast-2"
    encrypt        = true
    dynamodb_table = "devops-automation-tfstate-lock"
  }
}
