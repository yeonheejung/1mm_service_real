var mysql = require('mysql');
var async = require('async');
var dbPool = require('../common/dbpool');
var CronJob = require('cron').CronJob;
var moment = require('moment-timezone');

// 인기질문 리스트 - 나도 듣기 순
function listenCountTop10(id, callback) {

    // 인기 질문을 나도 듣기 순으로 뽑아오는 쿼리
    var sql = 'select * from ' +
        '(SELECT q.id questionId, u.id questionerId, a.id answerId, us.id answernerId, u.photo questionerPhoto, us.photo answernerPhoto, q.content questionContent, q.price, a.listening_count listenCount, a.length ' +
        'FROM question q join answer a on(q.id = a.question_id) ' +
        'JOIN user u on(u.id =q.questioner_id) ' +
        'JOIN user us on(us.id =q.answerner_id) ' +
        'ORDER BY a.listening_count desc LIMIT 10)a ' +
        'left outer join (select a.question_id payInfo ' +
        'from pay p join answer a on (p.answer_id = a.id) ' +
        'where p.user_id = ?)b ' +
        'on(a.questionId = b.payInfo) ' +
        'limit 10';

    var userphotos = process.env.HTTP_HOST + "/userphotos/";
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [id], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            async.each(results, function (item, done) {
                if (typeof item.payInfo === 'number') {
                    item.payInfo = '1';
                }
                else {
                    item.payInfo = '0';
                }

                item.questionerPhoto = userphotos + item.questionerPhoto;
                item.answernerPhoto = userphotos + item.answernerPhoto;

                done(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, results);

            });
        });
    });
}

// 인기질문 리스트 - 가격 순
function priceTop10(id, callback) {

    var sql = 'select * from ' +
        '(SELECT q.id questionId, u.id questionerId, a.id answerId, us.id answernerId, u.photo questionerPhoto, us.photo answernerPhoto, q.content questionContent, q.price, a.listening_count listenCount, a.length ' +
        'FROM question q join answer a on(q.id = a.question_id) ' +
        'JOIN user u on(u.id =q.questioner_id) ' +
        'JOIN user us on(us.id =q.answerner_id) ' +
        'ORDER BY q.price desc LIMIT 10)a ' +
        'left outer join (select a.question_id payInfo ' +
        'from pay p join answer a on (p.answer_id = a.id) ' +
        'where p.user_id = ?)b ' +
        'on(a.questionId = b.payInfo) ' +
        'limit 10';

    var userphotos = process.env.HTTP_HOST + "/userphotos/";

    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [id], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            async.each(results, function (item, done) {
                if (typeof item.payInfo === 'number') {
                    item.payInfo = '1';
                }
                else {
                    item.payInfo = '0';
                }

                item.questionerPhoto = userphotos + item.questionerPhoto;
                item.answernerPhoto = userphotos + item.answernerPhoto;

                done(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        });
    });
}

function showListeningBoxList(id, pageNo, count, callback) {
    var sql_search_pay =
        'select q.id questionId, q.questioner_id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, q.content questionerContent, a.id answerId, q.answerner_id answernerId, ' +
        'us.name answernerName, us.nickname answernerNickname, us.photo answernerPhoto, q.price, a.listening_count listenCount, a.length ' +
        'from pay p join answer a on (p.answer_id = a.id) ' +
        'join question q on (a.question_id = q.id) ' +
        'join user u on (q.questioner_id = u.id) ' +
        'join user us on (q.answerner_id = us.id) ' +
        'where p.user_id = ? ' +
        'order by p.date desc ' +
        'limit ?,?';

    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_search_pay, [id, count * (pageNo - 1), count], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            async.each(results, function (item, done) {
                item.payInfo = 1;
                done(null);
            }, function (err) {
                if (err) {
                    callback(err);
                }
                callback(err, results);
            });
        });
    });
}

function showMainList(id, pageNo, count, callback) {
    var sql_main_list =
        'select * ' +
        'from (select q.id questionId, q.questioner_id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, ' +
        'q.content questionerContent, a.id answerId, q.answerner_id answernerId, us.name answernerName, us.nickname answernerNickname, us.photo answernerPhoto, q.price, a.listening_count listenCount, a.length ' +
        'from question q join answer a on (q.id = a.question_id) ' +
        'join following f on (q.answerner_id = f.following_id) ' +
        'join user u on (q.questioner_id = u.id) ' +
        'join user us on (q.answerner_id = us.id) ' +
        'where f.user_id = ?)a left outer join (select answer_id payInfo from pay where user_id = ?) b on (a.answerId = b.payInfo) ' +
        'limit ?,?';

    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_main_list, [id, id, count * (pageNo - 1), count], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            var userphotos = process.env.HTTP_HOST + "/userphotos/";
            async.each(results, function (item, done) {

                if (typeof item.payInfo === 'number') {
                    item.payInfo = '1';
                } else {
                    item.payInfo = '0';
                }

                item.questionerPhoto = userphotos + item.questionerPhoto;
                item.answernerPhoto = userphotos + item.answernerPhoto;
                done(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            })
        });
    });
}


// 질문 하기
function registerQuestion(id, newQuestion, callback) {
    var sql_point_check = 'select point from user where id = ?';

    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {

        if (err) {
            return callback(err);
        }

        dbConn.beginTransaction(function (err) {
            if (err) {
                dbConn.release();
                dbPool.logStatus();
                return callback(err);
            }

            dbConn.query(sql_point_check, [id], function (err, results) {
                if (err) {
                    return callback(err);
                }


                if (results[0].point < newQuestion.price) {
                    dbConn.release();
                    dbPool.logStatus();
                    return callback(null, 1); // 잔액부족
                }


                async.series([insertQuestion, updateMyPoint, insertTempPoint], function (err) {
                    dbConn.release();
                    dbPool.logStatus();

                    if (err) {
                        return dbConn.rollback(function () {
                            callback(err);
                        });
                    }

                    dbConn.commit(function () {
                        callback(null, 0); //성공시 0리턴
                    });

                    refundAfterTwoday(id, newQuestion.q_insertId, newQuestion.t_insertId, newQuestion.price, function (err) {
                        try {
                            if (err) {
                                throw err;
                            }
                            console.log("성공");
                        } catch (err) {
                            console.log(err);
                        }
                    });

                });

            });

            function insertQuestion(callback) {
                var sql_insert_question = 'insert into question(questioner_id, answerner_id, price, date, content) values(?, ?, ?, ?, ?) ';
                dbConn.query(sql_insert_question, [newQuestion.questionerId, newQuestion.answernerId, newQuestion.price, newQuestion.date, newQuestion.content], function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    newQuestion.q_insertId = result.insertId;
                    callback(null);
                });
            }

            function updateMyPoint(callback) {
                var sql_update_my_point = 'update user set point = (point - ?), question_cost = (question_cost + ?) where id = ? ';
                dbConn.query(sql_update_my_point, [newQuestion.price, newQuestion.price, newQuestion.questionerId], function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }

            function insertTempPoint(callback) {
                var sql_update_temp_point = 'insert into transmission(user_id, question_id, temp_money) values(?, ?, ?)';
                dbConn.query(sql_update_temp_point, [newQuestion.questionerId, newQuestion.q_insertId, newQuestion.price], function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    newQuestion.t_insertId = result.insertId;
                    callback(null);
                });
            }
        });
    });
}


function refundAfterThreeday(id, questionId, transId, price, callback) {

    console.log(id, questionId, transId, price);

    var timeZone = "Asia/Seoul";
    var future = moment().tz(timeZone).add(4, 's');

    var crontime =
        future.second() + " " +
        future.minute() + " " +
        future.hour() + " " +
        future.date() + " " +
        future.month() + " " +
        future.day(); // 이거 작업할때는 +1 더하는거 아니다.

    var job = new CronJob(crontime, function () {
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }

            dbConn.beginTransaction(function (err) {
                if (err) {
                    dbConn.release();
                    return callback(err);
                }
                var sql_search_trans =
                    'select user_id ' +
                    'from transmission ' +
                    'where user_id = ? and question_id = ? ';

                dbConn.query(sql_search_trans, [id, questionId], function (err, results) {
                    if (err) {
                        dbConn.release();
                        return callback(err);
                    }
                    console.log(results);
                    if (results.length === 0) {

                        dbConn.release();
                        job.stop();
                        return callback(null);
                    }

                    async.series([deleteTransmssion, refundPoint, cancelQuestion], function (err) {
                        dbConn.release();
                        if (err) {
                            return dbConn.rollback(function () {
                                callback(err);
                            });
                        }
                        dbConn.commit(function () {
                            callback(null);
                            job.stop();
                        });
                    });
                });

            });

            function deleteTransmssion(done) {
                var sql_del_trans = 'delete from transmission where id = ?';
                dbConn.query(sql_del_trans, [transId], function (err, result) {
                    if (err) {
                        console.log("여기");
                        return done(err);
                    }
                    done(null);
                });
            }

            function refundPoint(done) {
                var sql_update_point =
                    'update user ' +
                    'set point = (point + ?), question_cost = (question_cost - ?) ' +
                    'where id = ?';
                dbConn.query(sql_update_point, [price, price, id], function(err, result) {
                    if (err) {
                        return done(err);
                    }
                    done(null);
                });
            }

            function cancelQuestion(done) {
                var sql_del_question = 'delete from question where id = ?';
                dbConn.query(sql_del_question, [questionId], function(err, result) {
                   if (err) {
                       return done(err);
                   }
                   done(null);
                });
            }

        });
    }, null, true, timeZone);
}


module.exports.listenCountTop10 = listenCountTop10;
module.exports.priceTop10 = priceTop10;
module.exports.registerQuestion = registerQuestion;
module.exports.showListeningBoxList = showListeningBoxList;
module.exports.showMainList = showMainList;
module.exports.registerQuestion = registerQuestion;