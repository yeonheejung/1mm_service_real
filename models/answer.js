var async = require('async');
var dbPool = require('../common/dbpool');
var path = require('path');
var url = require('url');

function registerAnswer(newAnswer, callback) {

    console.log(newAnswer);
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.beginTransaction(function (err) {
            if (err) {
                return callback(err);
            }

            async.series([insertAnswer, updateQuestionCost, deleteTransmission], function (err) {
                if (err) {
                    return dbConn.rollback(function () {
                        dbConn.release();
                        dbPool.logStatus();
                        callback(err);
                    });
                }

                dbConn.commit(function () {
                    dbConn.release();
                    callback(null);
                });
            });
        });

        function insertAnswer(done) {
            var sql_insert_answer = 'insert into answer(question_id, date, length, voice_content) values(?, str_to_date(?, \'%Y-%m-%dT%H:%i:%s\'), ?, ?)';

            dbConn.query(sql_insert_answer, [newAnswer.questionId, newAnswer.date, newAnswer.length, newAnswer.voiceContent], function (err, result) {
                if (err) {
                    return callback(err);
                }
                done(null);
            });
        }

        function updateQuestionCost(done) {
            var sql_insert_qCost =
                'update user ' +
                'set question_cost = question_cost + ((select price from question where id = ?) * 0.4) ' +
                'where id = (select answerner_id ' +
                            'from question ' +
                            'where id = ?) ';

            dbConn.query(sql_insert_qCost, [newAnswer.questionId, newAnswer.questionId], function (err, result) {
                if (err) {
                    return callback(err);
                }
                done(null);
            });
        }

        function deleteTransmission(done) {
            var sql_delete_trans =
                'delete from transmission ' +
                'where user_id = ? and question_id = ? ';

            dbConn.query(sql_delete_trans, [newAnswer.myId, newAnswer.questionId], function (err, reuslt) {
                if (err) {
                    return callback(err);
                }
                done(null);
            });
        }
    });
}

// 답변 스트리밍
function streamingAnswer(id, aid, callback) {
    var sql =
        'select a.voice_content voiceContent from answer a join pay p on(a.id = p.answer_id) ' +
        'where p.user_id = ? and p.answer_id = ? ';

    dbPool.logStatus();
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [id, aid], function(err, results) {

            dbConn.release();
            dbPool.logStatus();

            if (err) {
                return callback(err);
            }

            if (!results.length) {
                return callback(null, null);
            }
            var filename =results[0].voiceContent;
            results[0].fileurl = url.resolve('http://127.0.0.1:80', '/avs/' +filename);
            callback(null, results[0]);
        });
    })
}





module.exports.registerAnswer = registerAnswer;
module.exports.streamingAnswer = streamingAnswer;