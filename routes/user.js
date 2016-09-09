var express = require('express');
var router = express.Router();
var formidable = require('formidable');
var path = require('path');
var async = require('async');
var isSecure = require('./common').isSecure;
var User = require('../models/user');
var logger = require('../common/logger');

// 팔로잉 랜덤 추천, 기부랭킹, 검색 추천 연예인, 검색
router.get('/', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var type = parseInt(req.query.type, 10);
    console.log(type);
    if (type === 0) { // type 0일경우 팔로잉 추천
        User.recommendFollowing(function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                message: '팔로잉 추천',
                result: results
            });
        });
    } else if (type === 1) { // type 1일경우 검색 연예인 추천
        User.searchRecommend(function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                message: '검색 추천 연예인',
                result: results
            });
        });
    } else if (type === 2) { // type 2일경우 기부랭킹
        User.donationRank(function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                message: '기부랭킹',
                result: results
            });
        });
    } else if (req.query.word) { // 쿼리에 word가 들어가면 검색 진입

        var word = req.query.word;
        var pageNo = parseInt(req.query.pageNo, 10);
        var count = parseInt(req.query.count, 10);

        // 검색단어를 가지고 검색하는 함수
        User.searchUser(word, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                message: '사용자 검색',
                result: results
            });
        });
    }
});


// 내 페이지 조회 & 아이디 중복 체크
router.get('/me', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    // 동적 파라미터로 me가 들어오면 내 정보를 조회
    if (req.query.nickname) {
        var nickname = req.query.nickname;
        User.checkNickname(nickname, function (err, result) {
            if (err) {
                return next(err);
            }
            console.log(result);
            res.send({
                result: result
            });
        });
    } else {
        var id = req.user.id;
        User.showMyInfo(id, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    }
});

// 회원 포인트, 기부금 조회
router.get('/point', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var type = parseInt(req.query.type, 10);
    var id = req.user.id;

    if (type === 0) {
        User.showSavedPoint(id, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    }
    else if (type === 1) {
        User.showDonationPoint(id, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    }
});

// 회원 포인트 충전, 출금

router.put('/point', function (req, res, next) {

    var type = parseInt(req.query.type, 10);
    var price = parseInt(req.body.price, 10);
    var id = req.user.id;

    if (type === 0) {
        User.chargePoint(id, price, function (err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                message: "포인트가 충전 되었습니다."
            });
        });
    }
    else if (type === 1) {
        User.withdrawPoint(id, price, function (err, result) {
            if (err) {
                return next(err);
            }
            if (result === 1) {
                res.send({
                    message: "출금할 포인트가 부족합니다."
                });
            } else {
                res.send({
                    message: "포인트가 출금 되었습니다."
                });
            }
        });
    }
});

// 상대방 페이지 조회
router.get('/:uid', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    // 동적 파라미터로 회원 id가 들어오면 회원 정보를 조회
    var myId = req.user.id;
    var yourId = parseInt(req.params.uid, 10);
    console.log(myId);
    console.log(yourId);
    User.showYourInfo(myId, yourId, function (err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            result: results
        });
    });
});


// 프로필 수정
// 0 = 프로필 수정, 1 = photo 수정 삭제, 2 = donation 수정
router.put('/me', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);

    var id = req.user.id;
    var type = parseInt(req.query.type, 10);
    var newProfile = {};

    if (type === 0) { // 0일 경우 프로필 수정

        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
            newProfile.nickname = req.body.nickname;
            newProfile.name = req.body.name;
            if (req.body.stateMessage !== 'null') {
                newProfile.stateMessage = req.body.stateMessage;
            }

            User.updateProfile(id, newProfile, function (err) {
                if (err) {
                    return next(err);
                }
                res.send({
                    result: "프로필 수정을 완료하였습니다."
                });
            });

        } else {
            var form = new formidable.IncomingForm();
            form.uploadDir = path.join(__dirname, '../uploads/user/voices');
            form.keepExtensions = true;
            form.multiples = true;

            form.parse(req, function (err, fields, files) {
                if (err) {
                    return next(err);
                }

                newProfile.nickname = fields.nickname;
                newProfile.name = fields.name;
                newProfile.stateMessage = fields.stateMessage;
                newProfile.voiceMessage = path.basename(files.voiceMessage.path); //voice_message는 file이기 때문에 basename을 저장

                User.updateProfile(id, newProfile, function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.send({
                        result: "프로필 수정을 완료하였습니다."
                    });
                });
            });
        }


    } else if (type === 1) { // 1일 경우 프로필 사진만 수정
        var form = new formidable.IncomingForm();
        form.uploadDir = path.join(__dirname, '../uploads/user/photos');
        form.keepExtensions = true;
        form.multiples = true;

        form.parse(req, function (err, fields, files) {
            if (err) {
                return next(err);
            }

            var newPhoto = {};
            newPhoto.id = id;

            if (files.photo) { // 파일이 있으면 사진을 등록
                newPhoto.photo = path.basename(files.photo.path); // file의 basename만 저장해서 넘김
                User.updatePhoto(newPhoto, function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.send({
                        result: "사진 수정을 완료하였습니다."
                    });
                });
            }
        });
    } else if (type === 2) { // 2일경우 기부처 수정
        User.deletePhoto(id, function (err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: "사진을 삭제 하였습니다."
            })
        });
    } else if (type === 3) { // 3일경우 기부처 수정
        var donationId = parseInt(req.body.donationId, 10);
        User.updateDonation(id, donationId, function (err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                result: "프로필 기부처 수정을 완료 하였습니다."
            });
        });
    }
});

// 내 페이지 질문 목록
router.get('/me/questions', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var id = req.user.id;
    var pageNo = parseInt(req.query.pageNo, 10);
    var count = parseInt(req.query.count, 10);
    var answer = parseInt(req.query.answer, 10);

    // 내 페이지 질문 목록 조회
    if (req.query.direction === 'to') {
        User.showMySendQuestions(id, answer, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    } else if (req.query.direction === 'from') {
        User.showMyReceiveQuestions(id, answer, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            })
        });
    }
});

// 내 팔로우 등록
router.post('/me/follows', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var myId = req.user.id;
    var userId = req.body.userId;

    User.registerFollow(myId, userId, function (err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            result: result,
            message: "팔로우가 등록되었습니다."
        });

    });
});

// 팔로우 취소
router.delete('/:uid/follows', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var follow = {};
    follow.myId = req.user.id;
    follow.uid = parseInt(req.params.uid, 10);

    User.cancleFollow(follow, function (err, result) {
        if (err) {
            return next(err);
        }

        res.send({
            message: "팔로우를 취소하였습니다."
        });
    });
});

// 내 팔로우 목록 조회
router.get('/me/follows', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var pageNo = parseInt(req.query.pageNo, 10);
    var count = parseInt(req.query.count, 10);
    var id = req.user.id;

    if (req.query.direction === 'to') { // direction이 to이면 내 팔로잉 목록 조회
        User.showMyFollowing(id, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    } else if (req.query.direction === 'from') { // direction이 from이면 내 팔로우 목록 조회
        User.showMyFollower(id, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    }
});

// 음성 프로필 스트리밍
router.get('/:uid/voice', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var uid = req.params.uid;
    var id = req.user.id;

    if (req.params.uid === 'me') {
        User.streamingMyProfile(id, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    } else {
        User.streamingYourProfile(uid, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    }
});


// 상대방 팔로우 목록
router.get('/:uid/follows', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var pageNo = parseInt(req.query.pageNo, 10);
    var count = parseInt(req.query.count, 10);
    var myId = req.user.id;
    var yourId = req.params.uid;

    if (req.query.direction === 'to') {
        User.showYourFollowing(myId, yourId, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    } else if (req.query.direction === 'from') {
        User.showYourFollower(myId, yourId, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    }
});

// 상대방 페이지 질문 목록
router.get('/:uid/questions', function (req, res, next) {
    logger.log('info', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    var pageNo = parseInt(req.query.pageNo, 10);
    var count = parseInt(req.query.count, 10);
    var type = parseInt(req.query.type, 10);
    var myId = req.user.id;
    var yourId = parseInt(req.params.uid, 10);

    if (req.query.direction === 'to') {
        User.showYourSendQuestions(myId, yourId, type, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    } else if (req.query.direction === 'from') {
        User.showYourReceiveQuestions(myId, yourId, type, pageNo, count, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                result: results
            });
        });
    }
});


module.exports = router;