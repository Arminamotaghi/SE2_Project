# main.tf - Infrastructure as Code for Ticketing Platform
# Provider Configuration (AWS as target cloud)
provider "aws" {
  region = "eu-central-1"
}

# 1. Virtual Private Cloud (VPC) for Network Isolation
resource "aws_vpc" "ticketing_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name        = "ticketing-platform-vpc"
    Environment = "Production"
  }
}

# 2. Application Load Balancer (API Gateway Layer)
resource "aws_lb" "api_gateway_alb" {
  name               = "ticketing-api-gateway"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  tags = {
    Name = "TicketingLoadBalancer"
  }
}

# 3. Managed Kubernetes Cluster (EKS) for Microservices
resource "aws_eks_cluster" "microservices_cluster" {
  name     = "ticketing-eks-cluster"
  role_arn = aws_iam_role.eks_role.arn

  vpc_config {
    subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
  }
}

# 4. Managed PostgreSQL Database (Primary & Replica)
resource "aws_db_instance" "postgresql_primary" {
  allocated_storage    = 50
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t3.large"
  identifier           = "ticketing-db-primary"
  username             = "admin"
  password             = "securepassword123!" # In real scenario, use AWS Secrets
  skip_final_snapshot  = true
  multi_az             = true
}

# 5. Managed Redis Cluster for Distributed Locks (Seat Reservation)
resource "aws_elasticache_cluster" "redis_locks" {
  cluster_id           = "ticketing-redis-cluster"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7"
  port                 = 6379
}

# 6. Message Broker (Amazon MQ for RabbitMQ)
resource "aws_mq_broker" "event_broker" {
  broker_name        = "ticketing-rabbitmq"
  engine_type        = "RabbitMQ"
  engine_version     = "3.10.10"
  host_instance_type = "mq.m5.large"
  
  user {
    username = "rabbitadmin"
    password = "securepassword123!"
  }
}
