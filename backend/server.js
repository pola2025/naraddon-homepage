// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Express 앱 생성
const app = express();

// 데이터베이스 연결
connectDB();

// 미들웨어
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ 
    message: 'NARADDON API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users'
    }
  });
});

// API 라우트 (추후 추가)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/users', require('./routes/users'));

// 404 핸들러
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});