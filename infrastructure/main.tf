terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Security Group
resource "aws_security_group" "winx_trade_sg" {
  name        = "winx-trade-sg"
  description = "Security group for WINX Trade Management"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH access"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP access"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS access"
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Node.js application"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Outbound traffic"
  }

  tags = {
    Name = "winx-trade-sg"
  }
}

# EC2 Instance
resource "aws_instance" "winx_trade" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.winx_key.key_name
  vpc_security_group_ids = [aws_security_group.winx_trade_sg.id]
  
  # Instance configuration
  instance_initiated_shutdown_behavior = "stop"
  monitoring = true
  
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "winx-trade-management"
    Project = "WINX Trade"
    Environment = "production"
  }

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              mkdir -p /home/ec2-user/winx-trade
              chown ec2-user:ec2-user /home/ec2-user/winx-trade
              EOF
}

# SSH Key Pair
resource "aws_key_pair" "winx_key" {
  key_name   = "winx-trade-key-${formatdate("YYYYMMDD", timestamp())}"
  public_key = file("${path.module}/keys/winx_key.pub")
}

# Elastic IP
resource "aws_eip" "winx_eip" {
  instance = aws_instance.winx_trade.id
  domain   = "vpc"
  
  tags = {
    Name = "winx-trade-eip"
  }
}

# Output values
output "instance_public_ip" {
  value = aws_eip.winx_eip.public_ip
}

output "instance_id" {
  value = aws_instance.winx_trade.id
}

output "ssh_command" {
  value = "ssh -i infrastructure/keys/winx_key ec2-user@${aws_eip.winx_eip.public_ip}"
}

output "application_url" {
  value = "http://${aws_eip.winx_eip.public_ip}"
}
