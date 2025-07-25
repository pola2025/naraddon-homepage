const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // videos 폴더를 위한 정적 파일 서빙
  app.use('/videos', (req, res, next) => {
    // 비디오 파일에 대한 요청은 React Router로 가지 않도록 설정
    res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
};
