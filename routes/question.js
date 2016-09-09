var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var Question = require('../models/question');
var logger = require('../common/logger');


// 인기 질문 리스트
router.get('/popular10', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var type = parseInt(req.query.type, 10);
    var id = req.user.id;

    // 나도듣기 순 top 10
    if (type === 0) { // type = 0 이면 나도듣기순으로 인기질문 조회
        Question.listenCountTop10(id, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        })
    }
    // 높은 가격 순 top10
    if (type === 1) { // type = 1 이면 가격순으로 인기질문 조회
        Question.priceTop10(id, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        })

    }
});


// 팔로잉 질문 리스트, 나도 듣기 보관함
router.get('/', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var type = parseInt(req.query.type, 10);
    var pageNo = parseInt(req.query.pageNo, 10);
    var count = parseInt(req.query.count, 10);
    var id = req.user.id;

    if (type === 0) {
        Question.showMainList(id, pageNo, count, function(err, results) {
            if (err) {
                return next(err);
            }

            res.send({
                result: results
            });
        });
    } else if (type === 1) {
        Question.showListeningBoxList(id, pageNo, count, function(err, results) {
           if (err) {
               return next(err);
           }
            res.send({
               result: results
           })
        });
    }
});

// 질문하기
router.post('/', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);

    var id = req.user.id;
    var newQuestion = {};
    newQuestion.questionerId = req.user.id;
    newQuestion.answernerId = parseInt(req.body.answernerId, 10);
    newQuestion.price = parseInt(req.body.price, 10);
    newQuestion.date = req.body.date;
    newQuestion.content = req.body.content;

    Question.registerQuestion(id, newQuestion, function (err, result) {
        if (err) {
            return next(err);
        }

        if(result === 1) {
            res.send({
                message: "포인트가 부족합니다."
            });
        } else {
            res.send({
                message: "질문이 등록되었습니다."
            });
        }

    });
});

module.exports = router;