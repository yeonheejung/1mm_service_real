var dbPool = require('../common/dbpool');
var async = require('async');
var CronJob = require('cron').CronJob;
var moment = require('moment-timezone');

// 나도 듣기 결제
function payAnswerListening(listeningPay, callback) {
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.beginTransaction(function (err) {
            if (err) {
                return callback(err);
            }
            async.parallel([insertPay, updateMyPoint, updateYourPoint, updateListeningCount], function (err) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return dbConn.rollback(function () {
                        callback(err);
                    });
                }
                dbConn.commit(function () {
                    callback(null, listeningPay);
                });

                deleteAfterThreeday(listeningPay.id, listeningPay.answerId, function(err) {
                    try {
                        if(err) {
                            throw err;
                        }
                        console.log("성공");
                    } catch (err) {
                        console.log(err);
                    }
                });
            });
        });
        function insertPay(done) {
            var sql_insert_pay = 'insert into pay(user_id, answer_id, date) values (?, ?, str_to_date(?, \'%Y-%m-%dT%H:%i:%s\')) ';
            dbConn.query(sql_insert_pay, [listeningPay.id, listeningPay.answerId, listeningPay.date], function (err, result) {
                if (err) {
                    return done(err);
                }
                done(null);
            });
        }

        function updateMyPoint(done) {
            var sql_update_my_point = 'update user set point = (point - 200), listening_cost = (listening_cost + 200) where id = ? ';
            dbConn.query(sql_update_my_point, [listeningPay.id], function (err, result) {
                if (err) {
                    return done(err);
                }
                done(null);
            });
        }

        function updateYourPoint(done) {
            var sql_update_your_point =
                'update user ' +
                'set point = (point +200), listening_profit = (listening_profit + 200) ' +
                'where id = (select q.questioner_id ' +
                'from pay p join answer a on (p.answer_id = a.id) join question q on(a.question_id = q.id) ' +
                'where p.user_id = ? and p.answer_id = ?) ';

            dbConn.query(sql_update_your_point, [listeningPay.id, listeningPay.answerId], function (err, result) {
                if (err) {
                    return done(err);
                }
                done(null);
            });
        }

        function updateListeningCount(done) {
            var sql_insert_pay = 'update answer set listening_count = (listening_count + 1) where id = ?';
            dbConn.query(sql_insert_pay, [listeningPay.answerId], function (err, result) {
                if (err) {
                    return done(err);
                }
                done(null);
            });
        }

    });
}

function deleteAfterThreeday(id, answerId, callback) {
    var sql_delete_pay = 'delete from pay where user_id = ? and answer_id = ?';
    var timeZone = "Asia/Seoul";
    var future = moment().tz(timeZone).add(2, 's');

    var crontime =
        future.second() + " " +
        future.minute() + " " +
        future.hour() + " " +
        future.date() + " " +
        future.month() + " " +
        future.day(); // 이거 작업할때는 +1 더하는거 아니다.

    var job = new CronJob(crontime, function () {
        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {

            if (err) {
                return callback(err);
            }

            dbConn.query(sql_delete_pay, [id, answerId], function(err, result) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                callback(null);
                job.stop();
            });
        });
    }, null, true, timeZone);
}


module.exports.payAnswerListening = payAnswerListening;