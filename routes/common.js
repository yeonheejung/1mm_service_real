/*
function isAuthenticated(req, res, next) {
  if (!req.user) {
    return res.status(401).send({
      message: 'login required'
    });
  }
  next();
}
*/

// user가 없고 url에 auth가 없으면 로그인하라고 요청
function isAuthenticated(req, res, next) {
  if (!req.user && !req.url.match(/\/auth.*/i)) { // 로그인을 반드시 하도록 설정
    return res.status(401).send({
      message: 'login required'
    });
  }
  next();
}

// secure객체가 없으면 https로 접근하라고 요청
function isSecure(req, res, next) {
  if (!req.secure) {
    return res.status(426).send({
      message: 'upgrade required'
    });
  }
  next();
}


module.exports.isSecure = isSecure;
module.exports.isAuthenticated = isAuthenticated;