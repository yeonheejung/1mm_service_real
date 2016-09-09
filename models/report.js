var dbPool = require('../common/dbpool');

// 회원 신고
function registerReport(report, callback) {
    // 신고 당하는 사람을 테이블에 저장하는 쿼리
    var sql_insert_report = 'insert into report(reporter_id, suspect_id, content) values(?, ?, ?)';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_insert_report, [report.reportId, report.suspectId, report.contentNo], function (err, result) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });
}

module.exports.registerReport = registerReport;