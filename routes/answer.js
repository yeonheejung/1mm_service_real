var express = require('express');
var router = express.Router();
var Answer = require('../models/answer');
var formidable = require('formidable');
var path = require('path');
var logger = require('../common/logger');

// 답변하기
router.post('/', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);

    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../uploads/answer/voices');
    form.keepExtensions = true;
    form.multiples = true;

    form.parse(req, function (err, fields, files) {
        if (err) {
            return next(err);
        }

        var newAnswer = {};
        newAnswer.myId = req.user.id;
        newAnswer.questionId = parseInt(fields.questionId, 10);
        newAnswer.date = fields.date;
        newAnswer.length = parseInt(fields.length, 10);
        newAnswer.voiceContent = path.basename(files.voiceContent.path); //voice_message는 file이기 때문에 basename을 저장

        Answer.registerAnswer(newAnswer, function (err) {
            if (err) {
                return next(err);
            }

            res.send({
                message: "답변 등록을 완료 하였습니다."
            });
        });
    });

});

// 답변 스트리밍
router.get('/:aid', function(req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);

    var id = req.user.id;
    var aid = req.params.aid || undefined;

    if (!aid) {
        return res.send({

        })
    }

    Answer.streamingAnswer(id, aid, function(err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            result: results
        });
    });

});

module.exports = router;