#!/bin/bash

echo "Setting up MongoDB..."

# MongoDB 설치
sudo apt-get update
sudo apt-get install -y gnupg curl

# MongoDB 6.0 저장소 추가
curl -fsSL https://www.mongodb.com/static/pgp/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-archive-keyring.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org-6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

sudo apt-get update
sudo apt-get install -y mongodb-org

# MongoDB 데이터 디렉토리 설정
mkdir -p ~/mongodb/data
mkdir -p ~/mongodb/log

# MongoDB 설정 파일 생성
cat > ~/mongodb/mongod.conf << EOL
systemLog:
  destination: file
  path: /home/codespace/mongodb/log/mongod.log
  logAppend: true
storage:
  dbPath: /home/codespace/mongodb/data
net:
  port: 27017
  bindIp: 127.0.0.1
EOL

# MongoDB 시작 스크립트 생성
cat > ~/start-mongo.sh << 'EOL'
#!/bin/bash
if pgrep -x "mongod" > /dev/null
then
    echo "MongoDB is already running"
else
    echo "Starting MongoDB..."
    mongod --config ~/mongodb/mongod.conf --fork
    echo "MongoDB started"
fi
EOL

chmod +x ~/start-mongo.sh

# MongoDB 자동 시작
~/start-mongo.sh

# 환경 변수 설정
echo 'export MONGODB_URI="mongodb://localhost:27017/naraddon"' >> ~/.bashrc

echo "MongoDB setup completed!"