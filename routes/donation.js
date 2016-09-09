var express = require('express');
var router = express.Router();
var Donation = require('../models/donation');
var logger = require('../common/logger');
// 기부처 리스트 조회
router.get('/', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);

    var pageNo = parseInt(req.query.pageNo, 10);
    var count = parseInt(req.query.count, 10);

    Donation.listDonation(pageNo, count, function (err, results) {
        if(err) {
            return next(err);
        }
        res.send({
            result: results
        });
    });
});

// 기부처 조회
router.get('/:did', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var donationId = parseInt(req.params.did, 10);

    Donation.showDonation(donationId, function (err, result) {
        if(err) {
            return next(err);
        }
        res.send({
            result: result
        });
    });
});

module.exports = router;