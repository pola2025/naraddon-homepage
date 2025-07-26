#!/bin/bash
set -e

echo "Installing MongoDB..."

# MongoDB 설치
sudo apt-get update
sudo apt-get install -y wget gnupg

# MongoDB GPG 키 추가
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# MongoDB 리포지토리 추가
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian bullseye/mongodb-org/6.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# MongoDB 설치
sudo apt-get update
sudo apt-get install -y mongodb-org

# MongoDB 시작
sudo systemctl start mongod
sudo systemctl enable mongod

echo "MongoDB installed and started successfully!"

# npm 패키지 설치
echo "Installing npm packages..."
npm install
cd backend && npm install
cd ..

echo "Setup completed!"