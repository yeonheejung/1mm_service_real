var express = require('express');
var router = express.Router();
var Block = require('../models/block');
var logger = require('../common/logger');
// 회원 차단
router.post('/', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    // 차단하는 사람ID, 차단 당하는 사람 ID
    var blockingId = req.user.id;
    var blockedId = parseInt(req.body.blockedId, 10);
    Block.registerBlock(blockingId, blockedId, function (err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message: "차단 되었습니다."
        });
    });
});

// 회원 차단 해제
router.delete('/', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    // 차단하는 사람ID, 차단 당한 사람 ID
    var blockingId = req.user.id;
    var blockedId = parseInt(req.body.blockedId, 10);

    Block.releaseBlock(blockingId, blockedId, function (err, result) {
        if (err) {
            return next(err);
        }
        if (result.affectedRows !== 0) {
            res.send({
                message: "차단을 해제 하였습니다."
            });
        } else {
            res.send({
                message: "차단한 사람이 아닙니다."
            });
        }
    });
});

module.exports = router;

