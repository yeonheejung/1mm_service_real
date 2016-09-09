var async = require('async');
var dbPool = require('../common/dbpool');

// 기부처 조회 함수
function listDonation(pageNo, count, callback) {
    // 기부처 테이블에서 조회하는 쿼리
    var sql_search_donation =
        'select id donationId, name, photo, description ' +
        'from donation ' +
        'limit ?,?';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_search_donation, [count * (pageNo - 1), count], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            // 사진을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌
            async.each(results, function (item, callback) {
                var donationphotos = "http://ec2-52-78-158-195.ap-northeast-2.compute.amazonaws.com:8080/donationphotos/";

                item.photo = donationphotos + item.photo;

                callback(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                console.log(results);
                callback(null, results);
            });
        });
    });
}

function showDonation(donationId, callback) {
    // 기부처 테이블에서 조회하는 쿼리
    var sql_search_donation =
        'select id donationId, name, photo, description ' +
        'from donation ' +
        'where id = ?';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_search_donation, [donationId], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            // 사진을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌

            if (results[0] === undefined) {
                var message = "해당 기부처가 없습니다.";
                return callback(null, message);
            }

            var donationphotos = "http://ec2-52-78-139-46.ap-northeast-2.compute.amazonaws.com:8080/donationphotos/";
            results[0].photo = donationphotos + results[0].photo;
            callback(null, results[0]);
        });
    });
}

module.exports.showDonation = showDonation;
module.exports.listDonation = listDonation;