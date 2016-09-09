var async = require('async');
var dbPool = require('../common/dbpool');

// 회원 차단
function registerBlock(blockingId, blockedId, callback) {
    // 차단테이블에 등록하는 쿼리
    var sql_insert_block = 'insert into block(blocking_id, blocked_id) values(?, ?)';
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_insert_block, [blockingId, blockedId], function (err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });
}

// 회원 차단 해제
function releaseBlock(blockingId, blockedId, callback) {
    // 차단테이블에 등록하는 쿼리
    var sql_release_block =
        'delete from block ' +
        'where blocking_id = ? and blocked_id = ?';
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_release_block, [blockingId, blockedId], function (err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });
}

module.exports.releaseBlock = releaseBlock;
module.exports.registerBlock = registerBlock;