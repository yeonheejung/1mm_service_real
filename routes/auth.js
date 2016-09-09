var express = require('express');
var router = express.Router();
var passport = require('passport');
var FacebookTokenStrategy = require('passport-facebook-token');
var isSecure = require('./common').isSecure;
var User = require('../models/user');

// 회원 id를 세션에 저장
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

// 회원 if를 가지고 객체를 생성
passport.deserializeUser(function (id, done) {
    User.findUser(id, function (err, user) {
        if (err) {
            return done(err);
        }
        done(null, user);
    });
});

// 페이스북 token을 가지고 회원 정보를 찾거나 등록
passport.use(new FacebookTokenStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET
}, function (accessToken, refreshToken, profile, done) {
    console.log(accessToken);
    User.findOrCreate(profile, function (err, user) { //여기 id를 받아서 넘긴다.
        if (err) {
            return done(err);
        }
        return done(null, user);
    });
}));

// 로그아웃
router.get('/local/logout', function (req, res, next) {
    req.logout();
    res.send({ message: 'local logout' });
});

router.post('/facebook/token', isSecure, passport.authenticate('facebook-token'), function (req, res, next) {
    if (req.user) {
        res.send({
            message: "인증에 성공 하였습니다."
        });
    } else {
        res.send({
            message: "인증에 실패 하였습니다."
        });
    }
});


module.exports = router;