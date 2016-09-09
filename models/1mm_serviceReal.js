var async = require('async');
var fs = require('fs');
var path = require('path');
var url = require('url');

// 유저가 존재하는지 찾는 함수
function findUser(id, callback) {
    var sql_search_user =
        "select id " +
        "from user " +
        "where id = ?";
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_search_user, [id], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            //유저를 찾았으면 그 results[0]의 id를 객체에 넣고 유저 객체 반환
            var user = {};
            user.id = results[0].id;

            callback(null, user);
        });
    });
}

// 유저를 찾거나 등록하는 함수
function findOrCreate(profile, callback) {
    console.log("find or create");

    //페이스북 profile을 이용해 내 회원을 찾는 쿼리
    var sql_search_id =
        "select id " +
        "from user " +
        "where auth_id = ?";

    //회원을 등록하는 쿼리
    var sql_insert_auth_info = "insert into user(auth_id, auth_type) values(?, ?)";
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_search_id, [profile.id], function (err, results) {
            if (err) {
                dbConn.release();
                dbPool.logStatus();
                return callback(err);
            }
            //results.length가 0이 아니면 회원이 있다는 소리이므로 유제 객체를 반환
            if (results.length !== 0) {
                dbConn.release();
                dbPool.logStatus();
                var user = {};
                user.id = results[0].id;
                return callback(null, user);
            }
            //등록된 유저가 없으면 회원을 등록
            dbConn.query(sql_insert_auth_info, [profile.id, profile.provider], function (err, result) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }

                var user = {};
                user.id = result.insertId;

                return callback(null, user);
            });
        });
    });
}


// 검색 추천 연예인
function searchRecommend(callback) {
    // 최근에 가입한 연예인을 조회하는 쿼리
    var sql = 'SELECT id userId, name FROM user ORDER BY join_time DESC LIMIT 15';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            callback(null, results);
        });
    });
}

function checkNickname(nickname, callback) {

    var sql_search_ninkname = 'select nickname from user where nickname = ?';

    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_search_ninkname, [nickname], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }

            if (results.length === 0) {
                callback(null, 0); //중복 없을때
            } else {
                callback(null, -1); //중복 있을때
            }
        });
    });
}

// 내 페이지 보기
function showMyInfo(id, callback) {
    // 내페이지 조회 쿼리
    var sql =
        'select u.id, u.nickname, u.name, u.photo, u.state_message stateMessage, u.voice_message voiceMessage, d.id donationId, d.name donationName ' +
        'from user u left outer join donation d on(u.donation_id = d.id) ' +
        'where u.id = ?';

    var following = 0;
    var follower = 0;
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }

        dbConn.beginTransaction(function (err) {
            if (err) {
                return callback(err);
            }
            // 파일을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌
            dbConn.query(sql, [id], function (err, results) {
                if (err) {
                    return callback(err);
                }

                if (results.length === 0) {
                    return callback(err, results);
                }

                async.series([searchFollowing, searchFollower], function (err) {
                    if (err) {
                        return callback(err);
                    }
                    var userphotos = process.env.HTTP_HOST + "/userphotos/";
                    var uservoiceMessage = process.env.HTTP_HOST + "/avs/";
                    results[0].voiceMessage = uservoiceMessage + results[0].voiceMessage;
                    results[0].photo = userphotos + results[0].photo;
                    results[0].following = following;
                    results[0].follower = follower;
                    callback(null, results[0]);
                });
            });
        });

        function searchFollowing(done) {
            var sql_search_following =
                'select count(user_id) following ' +
                'from following ' +
                'where user_id = ?';
            dbConn.query(sql_search_following, [id], function (err, result) {
                if (err) {
                    return done(err);
                }
                following = result[0].following;
                done(null);
            });
        }

        function searchFollower(done) {
            var sql_search_follower =
                'select count(user_id) follower ' +
                'from following ' +
                'where following_id = ?';

            dbConn.query(sql_search_follower, [id], function (err, result) {
                if (err) {
                    return done(err);
                }
                follower = result[0].follower;
                done(null);
            });
        }

    });
}

// 상대방 페이지 보기
function showYourInfo(myId, yourId, callback) {

    // 상대방 정보 조회하는 쿼리
    var sql =
        'select u.id, u.nickname, u.name, u.photo, u.state_message, d.id donationId, d.name donationName ' +
        'from user u join donation d on(u.donation_id = d.id) ' +
        'where u.id = ?';

    var followInfo; //상대방이 내가 팔로잉 했는 사람인지 아닌지 알기 위한 변수
    var following = 0;
    var follower = 0;
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }

        // 내가 팔로잉했는 사람인지 먼저 체크 후 회원조회
        async.series([followCheck], function (err) {

            if (err) {
                return callback(err);
            }
            dbConn.query(sql, [yourId], function (err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }

                if (results.length === 0) {
                    return callback(err, results);
                }
                var userphotos = process.env.HTTP_HOST + "/userphotos/";

                async.series([searchFollowing, searchFollower], function (err) {
                    if (err) {
                        return callback(err);
                    }

                    results[0].photo = userphotos + results[0].photo;
                    results[0].following = following;
                    results[0].follower = follower;
                    results[0].followInfo = followInfo;
                    callback(null, results[0]);
                });
            });
        });

        function followCheck(callback) {
            // 나와 팔로잉 인지 체크 하는 쿼리
            var sql =
                "select user_id " +
                "from following " +
                "where user_id = ? and following_id = ? ";

            dbConn.query(sql, [myId, yourId], function (err, results) {
                if (err) {
                    return callback(err);
                }
                if (results.length !== 0) {
                    return followInfo = 1;
                } else {
                    return followInfo = 0;
                }
            });
            callback(null);
        }

        function searchFollowing(done) {
            var sql_search_following =
                'select count(user_id) following ' +
                'from following ' +
                'where user_id = ?';
            dbConn.query(sql_search_following, [yourId], function (err, result) {
                if (err) {
                    return done(err);
                }
                following = result[0].following;
                done(null);
            });
        }

        function searchFollower(done) {
            var sql_search_follower =
                'select count(user_id) follower ' +
                'from following ' +
                'where following_id = ?';

            dbConn.query(sql_search_follower, [yourId], function (err, result) {
                if (err) {
                    return done(err);
                }
                follower = result[0].follower;
                done(null);
            });
        }
    });
}

// 팔로잉 추천
function recommendFollowing(callback) {
    //랜덤으로 회원 정보를 뽑는 쿼리
    var sql = 'SELECT id userId, name, photo FROM user WHERE celebrity =1 ORDER BY rand() LIMIT 12';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }

            // 사진을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌
            var userphotos = process.env.HTTP_HOST + "/userphotos/";

            async.each(results, function (item, callback) {
                item.photo = userphotos + item.photo;
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


// 기부랭킹
function donationRank(callback) {

    // 기부가격순이 높은 사람 5명을 뽑는 쿼리
    var sql =
        'SELECT u.id userId, u.name userName, u.photo userPhoto, d.id donationId, d.name donationName, d.photo donationPhoto ' +
        'from question q join user u on (u.id = q.answerner_id) ' +
        'join donation d on (d.id = u.donation_id) ' +
        'where u.celebrity = 1 ' +
        'group by u.name ' +
        'order by sum(price) desc limit 5 ';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }

            // 사진을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌
            var userphotos = process.env.HTTP_HOST + "/userphotos/";

            async.each(results, function (item, callback) {
                item.userPhoto = userphotos + item.userPhoto;
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


// 프로필 수정하는 함수
function updateProfile(id, newProfile, callback) {

    // 음성 파일이 있는지 없는지 체크하는 쿼리
    var sql_select_voice_message =
        'select voice_message voiceMessage ' +
        'from user ' +
        'where id = ?';

    // 프로필 수정하는 쿼리
    var sql_update_profile =
        'update user ' +
        'set ? ' +
        'where id = ?';

    var profile = {};
    profile.nickname = newProfile.nickname;
    profile.name = newProfile.name;
    profile.state_message = newProfile.stateMessage;
    profile.voice_message = newProfile.voiceMessage;

    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }

        // 프로필을 select해서 있는지 없는지 확인
        dbConn.query(sql_select_voice_message, [id], function (err, results) {
            if (err) {
                dbConn.release();
                dbPool.logStatus();
                return callback(err);
            }

            // 파일이 없으면 프로필 수정
            if (results[0].voiceMessage === null) {
                modifyProfile(function (err) {
                    if (err) {
                        dbConn.release();
                        dbPool.logStatus();
                        return callback(err);
                    }
                    dbConn.release();
                    dbPool.logStatus();
                    callback(null);
                });
            } else { // 파일이 있으면 프로필 수정하고 기존의 파일 삭제
                dbConn.beginTransaction(function (err) {
                    if (err) {
                        dbConn.release();
                        dbPool.logStatus();
                        return callback(err);
                    }
                    async.series([modifyProfile, deleteOriginalFile], function (err, results) {
                        if (err) {
                            //에러가 있으면 롤백
                            return dbConn.rollback(function () {
                                dbConn.release();
                                dbPool.logStatus();
                                callback(err);
                            });
                        }
                        //에러가 없으면 커밋
                        dbConn.commit(function () {
                            callback(null);
                            dbConn.release();
                            dbPool.logStatus();
                        });
                    });
                });
            }

            // 프로필 수정 함수
            function modifyProfile(done) {
                dbConn.query(sql_update_profile, [profile, id], function (err, result) {
                    if (err) {
                        return done(err);
                    }

                    done(null);
                });
            }

            // 경로에 있는 사진 삭제
            function deleteOriginalFile(done) {
                if (err) {
                    return done(err);
                }
                var filePath = path.join(__dirname, '../uploads/user/voices/');
                // 실제 경로를 찾아줘서 삭제
                fs.unlink(path.join(filePath, results[0].voiceMessage), function (err) {
                    if (err) {
                        return done(err);
                    }
                    done(null);
                });
            }
        });
    });
}


// 프로필 사진을 수정하는 함수
function updatePhoto(newPhoto, callback) {

    //사진이 있는지 없는지 확인하는 쿼리
    var sql_select_photo =
        'select photo ' +
        'from user ' +
        'where id = ?';

    // 사진을 업데이트 하는 쿼리
    var sql_update_photo =
        'update user ' +
        'set photo = ? ' +
        'where id = ?';

    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }

        dbConn.query(sql_select_photo, [newPhoto.id], function (err, results) {
            if (err) {
                dbConn.release();
                dbPool.logStatus();
                return callback(err);
            }

            // 사진 데이터를 셀렉해서 없으면 수정
            if (results[0].photo === null) {
                modifyPhoto(function (err) {
                    if (err) {
                        dbConn.release();
                        dbPool.logStatus();
                        return callback(err);
                    }
                    dbConn.release();
                    dbPool.logStatus();
                    callback(null);
                });
            } else { // 사진이 있으면 수정하고 기존의 파일 삭제
                dbConn.beginTransaction(function (err) {
                    if (err) {
                        dbConn.release();
                        dbPool.logStatus();
                        return callback(err);
                    }
                    async.series([modifyPhoto, deleteOriginalFile], function (err, results) {
                        if (err) {
                            // 에러가 있으면 롤백
                            return dbConn.rollback(function () {
                                dbConn.release();
                                dbPool.logStatus();
                                callback(err);
                            });
                        }
                        //에러가 없으면 커밋
                        dbConn.commit(function () {
                            callback(null);
                            dbConn.release();
                            dbPool.logStatus();
                        });
                    });
                });
            }

            // 프로필 수정
            function modifyPhoto(done) {
                dbConn.query(sql_update_photo, [newPhoto.photo, newPhoto.id], function (err, result) {
                    if (err) {
                        return done(err);
                    }
                    done(null);
                });
            }

            // 기존의 파일 삭제하는 함수
            function deleteOriginalFile(done) {
                if (err) {
                    return done(err);
                }
                var filePath = path.join(__dirname, '../uploads/user/photos');
                // 실제 경로를 찾아줘서 삭제
                fs.unlink(path.join(filePath, results[0].photo), function (err) {
                    if (err) {
                        return done(err);
                    }
                    done(null);
                });
            }
        });
    });
}


// 프로필 사진 삭제 하는 함수
function deletePhoto(id, callback) {
    // 프로필 사진 셀렉
    var sql_search_photo =
        'select photo ' +
        'from user ' +
        'where id = ?';

    // 삭제하기 위해 null으로 업데이트 하는 쿼리
    var sql_delete_photo =
        'update user ' +
        'set photo = null ' +
        'where id = ?';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_search_photo, [id], function (err, results) {
            if (err) {
                dbConn.release();
                dbPool.logStatus();
                return callback(err);
            }
            // 셀렉한 사진이 없으면 삭제 할것이 없다고 말해줌
            if (results[0].photo === null) {
                dbConn.release();
                dbPool.logStatus();
                return callback(null, 0); //0은 삭제할 사진이 없다는걸 의미
            }

            // 삭제할 사진이 있으면 null으로 수정하고 기존의 파일을 삭제
            dbConn.beginTransaction(function (err) {
                if (err) {
                    dbConn.release();
                    dbPool.logStatus();
                    return callback(err);
                }
                async.series([modifyPhoto, deleteOriginalFile], function (err, results) {
                    if (err) {
                        return dbConn.rollback(function () {
                            dbConn.release();
                            dbPool.logStatus();
                            callback(err);
                        });
                    }

                    dbConn.commit(function () {
                        dbConn.release();
                        dbPool.logStatus();
                        callback(null, 1); // 1은 파일이 있어서 삭제한다는 의미
                    });
                });

                function modifyPhoto(done) {
                    dbConn.query(sql_delete_photo, [id], function (err, result) {
                        if (err) {
                            return done(err);
                        }
                        done(null);
                    });
                }

                // 기존의 파일을 삭제하는 함수
                function deleteOriginalFile(done) {
                    if (err) {
                        return done(err);
                    }
                    var filePath = path.join(__dirname, '../uploads/user/photos');
                    // 실제 경로를 찾아줘서 삭제
                    fs.unlink(path.join(filePath, results[0].photo), function (err) {
                        if (err) {
                            return done(err);
                        }
                        done(null);
                    });
                }
            });
        });
    });
}

function updateDonation(id, donationId, callback) {
    var sql_update_donation =
        'update user ' +
        'set donation_id = ? ' +
        'where id = ? ';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_update_donation, [donationId, id], function (err, result) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });
}

// 유저 검색
function searchUser(word, pageNo, count, callback) {
    var queryWord = '%' + word + '%';

    var sql_search_word =
        'select id, photo, nickname, name, celebrity ' +
        'from user ' +
        'where nickname like ? or name like ? ' +
        'limit ?,?';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_search_word, [queryWord, queryWord, count * (pageNo - 1), count], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }

            var userphotos = process.env.HTTP_HOST + "/userphotos/";

            async.each(results, function (item, callback) {
                item.photo = userphotos + item.photo;
                callback(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        });
    });
}

// 팔로우 등록
function registerFollow(myId, yourId, callback) {
    var sql =
        'insert into following(user_id, following_id) values(?, ?)';

    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }

        if (yourId instanceof Array) {

            async.each(yourId, function (item, done) {
                parseInt(item, 10);
                done(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }

                async.each(yourId, function (item, done) {
                    dbConn.query(sql, [myId, item], function (err, result) {
                        if (err) {
                            return done(err);
                        }
                        done(null);
                    });
                }, function (err) {
                    dbConn.release();
                    dbPool.logStatus();
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            });
        } else {
            dbConn.query(sql, [myId, yourId], function (err, result) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        }
    });
}

// 팔로우 취소
function cancleFollow(follow, callback) {
    var sql = 'DELETE FROM following WHERE user_id = ? and following_id = ? ';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [follow.myId, follow.uid], function (err, result) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });
}

// 내 페이지 질문 목록 - 내가 질문한 목록
function showMySendQuestions(id, answer, pageNo, count, callback) {
    var sql_incomplete_answer =
        'select q.id questionId, q.questioner_id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, q.content questionerContent, q.price ' +
        'from question q left outer join answer a on(q.id = a.question_id) ' +
        'join user u on(q.questioner_id = u.id) ' +
        'where q.questioner_id = ? and a.voice_content is null ' +
        'limit ?, ?';

    var sql_complete_answer =
        'select q.id questionId, q.questioner_id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, q.content questionerContent, a.id answerId, q.answerner_id answernerId, ' +
        'us.name answernerName, us.nickname answernerNickname, us.photo answernerPhoto, q.price, a.listening_count listenCount, a.length ' +
        'from question q join answer a on(q.id = a.question_id) ' +
        'join user u on(q.questioner_id = u.id) ' +
        'join user us on(q.answerner_id = us.id) ' +
        'where q.questioner_id = ? ' +
        'limit ?, ?';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {

        if (answer === 0) {
            dbConn.query(sql_incomplete_answer, [id, (pageNo - 1) * count, count], function (err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }

                // 파일을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌
                var userphotos = process.env.HTTP_HOST + "/userphotos/";

                async.each(results, function (item, callback) {
                    item.questionerPhoto = userphotos + item.questionerPhoto;
                    callback(null);
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    console.log(results);
                    callback(null, results);
                });
            });
        } else if (answer === 1) {
            dbConn.query(sql_complete_answer, [id, (pageNo - 1) * count, count], function (err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }

                // 파일을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌

                var userphotos = process.env.HTTP_HOST + "/userphotos/";
                async.each(results, function (item, callback) {
                    item.questionerPhoto = userphotos + item.questionerPhoto;
                    item.answernerPhoto = userphotos + item.answernerPhoto;
                    item.payInfo = 1;
                    callback(null);
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    console.log(results);
                    callback(null, results);
                });
            });
        }
    });
}

// 내 페이지 질문 목록 - 내가 질문 받은 목록
function showMyReceiveQuestions(id, answer, pageNo, count, callback) {
    var sql_incomplete_answer =
        'select q.id questionId, q.questioner_id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, q.content questionerContent, q.price ' +
        'from question q left outer join answer a on(q.id = a.question_id) ' +
        'join user u on(q.questioner_id = u.id) ' +
        'where q.answerner_id = ? and a.voice_content is null ' +
        'limit ?, ?';

    var sql_complete_answer =
        'select q.id questionId, q.questioner_id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, q.content questionerContent, a.id answerId, q.answerner_id answernerId, ' +
        'us.name answernerName, us.nickname answernerNickname, us.photo answernerPhoto, q.price, a.listening_count listenCount, a.length ' +
        'from question q join answer a on(q.id = a.question_id) ' +
        'join user u on(q.questioner_id = u.id) ' +
        'join user us on(q.answerner_id = us.id) ' +
        'where q.answerner_id = ? ' +
        'limit ?, ?';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (answer === 0) {
            dbConn.query(sql_incomplete_answer, [id, (pageNo - 1) * count, count], function (err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }

                var userphotos = process.env.HTTP_HOST + "/userphotos/";
                async.each(results, function (item, done) {
                    item.questionerPhoto = userphotos + item.questionerPhoto;
                    done(null);
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results);
                });
            });
        } else if (answer === 1) {
            dbConn.query(sql_complete_answer, [id, (pageNo - 1) * count, count], function (err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }

                var userphotos = process.env.HTTP_HOST + "/userphotos/";

                // 파일을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌
                async.each(results, function (item, callback) {
                    item.questionerPhoto = userphotos + item.questionerPhoto;
                    item.answernerPhoto = userphotos + item.answernerPhoto;
                    item.payInfo = 1;
                    callback(null);
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results);
                });
            });
        }
    });
}

// 내 팔로잉 목록 조회
function showMyFollowing(id, pageNo, count, callback) {
    //팔로잉 목록 조회 쿼리
    var sql =
        'SELECT f.following_id userId, u.photo, u.nickname, u.name, u.celebrity, f.distance ' +
        'From following f JOIN user u ON(u.id = f.following_id) ' +
        'JOIN user us on(us.id = f.user_id) ' +
        'WHERE f.user_id = ? ' +
        'LIMIT ?, ? ';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [id, (pageNo - 1) * count, count], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return (callback);
            }
            // 사진을 전송 해줄때 내 파일 저장 경로를 같이 붙여서 뿌려줌
            async.each(results, function (item, callback) {
                var userphotos = process.env.HTTP_HOST + "/userphotos/";

                item.photo = userphotos + item.photo;
                callback(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        });
    });
}

// 내 팔로워 목록 조회

function showMyFollower(id, pageNo, count, callback) {

    var sql_myFollowerList =
        'select c.userId, c.photo, c.nickname, c.name, c.celebrity, b.myfollowing followInfo ' +
        'from (SELECT f.user_id userId, us.photo photo, us.nickname nickname, us.name name, us.celebrity celebrity ' +
        'FROM following f JOIN user u ON(u.id = f.following_id) ' +
        'JOIN user us ON(us.id = f.user_id) ' +
        'WHERE f.following_id = ?)c ' +
        'left outer join (select fo.user_id yourfollower ' +
        'from following f  join following fo on(f.user_id = fo.following_id) ' +
        'where f.user_id= ? ' +
        'group by fo.user_id)a on(c.userId = a.yourfollower) ' +
        'left outer join (SELECT f.following_id myfollowing ' +
        'From following f join user u on(u.id = f.following_id) ' +
        'join user us on(us.id = f.user_id) ' +
        'where f.user_id = ?)b ' +
        'on (a.yourfollower = b.myfollowing) limit ?, ? ';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_myFollowerList, [id, id, id, (pageNo - 1) * count, count], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }

            async.each(results, function (item, done) {
                if (typeof item.followInfo === 'number') {
                    item.followInfo = 1;
                } else {
                    item.followInfo = 0;
                }
                done(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                async.each(results, function (item, callback) {
                    var userphotos = process.env.HTTP_HOST + "/userphotos/";

                    item.photo = userphotos + item.photo;
                    callback(null);
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results);
                });
            });
        });
    });
}


// TODO: 상대방 팔로잉 목록
function showYourFollowing(myId, yourId, pageNo, count, callback) {
    var sql =
        'SELECT f.following_id userId, u.photo, u.nickname, u.name, u.celebrity, f.distance ' +
        'From following f JOIN user u ON(u.id = f.following_id) ' +
        'JOIN user us on(us.id = f.user_id) ' +
        'WHERE f.user_id = ? ' +
        'LIMIT ?, ? ';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [yourId, (pageNo - 1) * count, count], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return (callback);
            }
            callback(null, results);
        });
    });
}

// 상대방 팔로워 목록
function showYourFollower(myId, yourId, pageNo, count, callback) {
    var sql_yourFollowerList =
        'select c.userId, c.photo, c.nickname, c.name, c.celebrity, b.myfollowing followInfo ' +
        'from (SELECT f.user_id userId, us.photo photo, us.nickname nickname, us.name name, us.celebrity celebrity ' +
        'FROM following f JOIN user u ON(u.id = f.following_id) ' +
        'JOIN user us ON(us.id = f.user_id) ' +
        'WHERE f.following_id = ?)c ' +
        'left outer join (select fo.user_id yourfollower ' +
        'from following f  join following fo on(f.user_id = fo.following_id) ' +
        'where f.user_id= ? ' +
        'group by fo.user_id)a on(c.userId = a.yourfollower) ' +
        'left outer join (SELECT f.following_id myfollowing ' +
        'From following f join user u on(u.id = f.following_id) ' +
        'join user us on(us.id = f.user_id) ' +
        'where f.user_id = ?)b ' +
        'on (a.yourfollower = b.myfollowing) limit ?, ? ';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql_yourFollowerList, [yourId, yourId, myId, (pageNo - 1) * count, count], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            async.each(results, function (item, done) {
                if (typeof item.followInfo === 'number') {
                    item.followInfo = 1;
                } else {
                    item.followInfo = 0;
                }
                done(null);
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                async.each(results, function (item, callback) {
                    var userphotos = process.env.HTTP_HOST + "/userphotos/";

                    item.photo = userphotos + item.photo;
                    callback(null);
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results);
                });
            });
        });
    });
}

// 상대방 페이지 질문 목록 - 상대방이 질문한 목록
function showYourSendQuestions(myId, yourId, type, pageNo, count, callback) {
    var sql_orderby_listenCount =
        'select a.questionId, a.questionerId, a.questionerName,a.questionerNickname, a.questionerPhoto, ' +
        'a.answerId, a.anwernerId, a.answernerName, a.answernerNickname, a.answernerPhoto, a.questionerContent, a.price, a.listenCount, b.answer_id payInfo ' +
        'from (select q.id questionId, u.id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, ' +
        'a.id answerId, us.id anwernerId, us.name answernerName, us.nickname answernerNickname, us.photo answernerPhoto, q.content questionerContent, q.price, a.listening_count listenCount, a.question_id,  q.date date ' +
        'from question q join answer a on(q.id = a.question_id) ' +
        'join user u on(u.id = q.questioner_id) ' +
        'join user us on(us.id = q.answerner_id) ' +
        'where q.id = a.question_id and u.id = ?)a ' +
        'left outer join (select answer_id from pay p where user_id = ?)b ' +
        'on(a.question_id = b.answer_id) ' +
        'order by a.listenCount desc ' +
        'limit ?, ? ';

    var sql_orderby_new =
        'select a.questionId, a.questionerId, a.questionerName,a.questionerNickname, a.questionerPhoto, ' +
        'a.answerId, a.anwernerId, a.answernerName, a.answernerNickname, a.answernerPhoto, a.questionerContent, a.price, a.listenCount, b.answer_id payInfo ' +
        'from (select q.id questionId, u.id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, ' +
        'a.id answerId, us.id anwernerId, us.name answernerName, us.nickname answernerNickname, us.photo answernerPhoto, q.content questionerContent, q.price, a.listening_count listenCount, a.question_id,  q.date date ' +
        'from question q join answer a on(q.id = a.question_id) ' +
        'join user u on(u.id = q.questioner_id) ' +
        'join user us on(us.id = q.answerner_id) ' +
        'where q.id = a.question_id and u.id = ?)a ' +
        'left outer join (select answer_id from pay p where user_id = ?)b ' +
        'on(a.question_id = b.answer_id) ' +
        'order by a.date desc ' +
        'limit ?, ? ';

    var userphotos = process.env.HTTP_HOST + "/userphotos/";
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        if (type === 0) {  // 나도듣기 순
            dbConn.query(sql_orderby_listenCount, [yourId, myId, count * (pageNo - 1), count], function (err, results) {
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
        }
        else if (type === 1) {  // 최신 순
            dbConn.query(sql_orderby_new, [yourId, myId, count * (pageNo - 1), count], function (err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                async.each(results, function (item, callback) {
                    if (typeof item.payInfo === 'number') {
                        item.payInfo = '1';
                    }
                    else {
                        item.payInfo = '0';
                    }
                    item.questionerPhoto = userphotos + item.questionerPhoto;
                    item.answernerPhoto = userphotos + item.answernerPhoto;

                    callback(null);
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results);
                });
            });
        }
    });
}


// 상대방 페이지 - 상대방이 질문 받은 목록
function showYourReceiveQuestions(myId, yourId, type, pageNo, count, callback) {
    var sql_orderby_listenCount =
        'select a.questionId, a.questionerId, a.questionerName,a.questionerNickname, a.questionerPhoto, ' +
        'a.answerId, a.anwernerId, a.answernerName, a.answernerNickname, a.answernerPhoto, a.questionerContent, a.price, a.listenCount, b.answer_id payInfo ' +
        'from (select q.id questionId, u.id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, ' +
        'a.id answerId, us.id anwernerId, us.name answernerName, us.nickname answernerNickname, us.photo answernerPhoto, q.content questionerContent, q.price, a.listening_count listenCount, a.question_id,  q.date date ' +
        'from question q join answer a on(q.id = a.question_id) ' +
        'join user u on(u.id = q.questioner_id) ' +
        'join user us on(us.id = q.answerner_id) ' +
        'where q.id = a.question_id and us.id = ?)a ' +
        'left outer join (select answer_id from pay p where user_id = ?)b ' +
        'on(a.question_id = b.answer_id) ' +
        'order by a.listenCount desc ' +
        'limit ?, ? ';

    var sql_orderby_new = 'select a.questionId, a.questionerId, a.questionerName,a.questionerNickname, a.questionerPhoto, ' +
        'a.answerId, a.anwernerId, a.answernerName, a.answernerNickname, a.answernerPhoto, a.questionerContent, a.price, a.listenCount, b.answer_id payInfo ' +
        'from (select q.id questionId, u.id questionerId, u.name questionerName, u.nickname questionerNickname, u.photo questionerPhoto, ' +
        'a.id answerId, us.id anwernerId, us.name answernerName, us.nickname answernerNickname, us.photo answernerPhoto, q.content questionerContent, q.price, a.listening_count listenCount, a.question_id,  q.date date ' +
        'from question q join answer a on(q.id = a.question_id) ' +
        'join user u on(u.id = q.questioner_id) ' +
        'join user us on(us.id = q.answerner_id) ' +
        'where q.id = a.question_id and us.id = ?)a ' +
        'left outer join (select answer_id from pay p where user_id = ?)b ' +
        'on(a.question_id = b.answer_id) ' +
        'order by a.date desc ' +
        'limit ?, ? ';

    var userphotos = process.env.HTTP_HOST + "/userphotos/";
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        if (err) {
            return callback(err);
        }
        if (type === 0) {  // 나도듣기 순
            dbConn.query(sql_orderby_listenCount, [yourId, myId, count * (pageNo - 1), count], function (err, results) {
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
        }
        else if (type === 1) {  // 최신 순
            dbConn.query(sql_orderby_new, [yourId, myId, count * (pageNo - 1), count], function (err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                async.each(results, function (item, callback) {
                    if (typeof item.payInfo === 'number') {
                        item.payInfo = '1';
                    }
                    else {
                        item.payInfo = '0';
                    }
                    item.questionerPhoto = userphotos + item.questionerPhoto;
                    item.answernerPhoto = userphotos + item.answernerPhoto;

                    callback(null);
                }, function (err) {
                    if (err) {
                        return callback(err);
                    }
                });
                callback(null, results);
            });
        }
    });
}

// 회원 포인트 조회
function showSavedPoint(id, callback) {
    var sql_search_point =
        'select point, pay_total, listening_profit, question_cost, listening_cost, withdraw_total ' +
        'from user ' +
        'where id = ?';
    dbPool.logStatus();
    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql_search_point, [id], function (err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            callback(null, results[0]);
        });
    });
}

// 포인트 충전
function chargePoint(id, price, callback) {
    var sql = 'update user ' +
        'set point = (point + ?), pay_total = (pay_total + ?) ' +
        'where id = ?';

    dbPool.getConnection(function (err, dbConn) {
        dbConn.query(sql, [price, price, id], function (err, result) {
            dbConn.release();
            if (err) {
                return callback(err);
            }
            callback(null, result);
        });
    });
}

// 포인트 출금
function withdrawPoint(id, price, callback) {

    var sql_check_point = 'select point from user where id = ? ';
    var sql_update_point = 'update user ' +
        'set point = (point - ?), withdraw_total = (withdraw_total + ?) ' +
        'where id =? ';

    dbPool.logStatus();
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
          return callback(err);
        }

        dbConn.query(sql_check_point, [id], function(err, results) {
            if (err) {
                dbConn.release();
                return callback(err);
            }

            if(results[0].point < price || results[0].point < 10000) {
                dbConn.release();
                return callback(null, 1);
            }
            dbConn.query(sql_update_point, [price, price, id], function(err, result) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, result);
            });
        });
    });
}

// 회원 기부금 조회
function showDonationPoint(id, callback) {
    var sql = 'select b.totalDonation, c.monthlyDonation ' +
        'from (select sum(q.price*0.5) totalDonation, q.answerner_id answernerId ' +
        'from question q join answer a on(q.id = a.question_id) ' +
        'where q.answerner_id =1)b ' +
        'join (select sum(q.price*0.5) monthlyDonation, q.answerner_id answernerId ' +
        'from question q join answer a on(q.id = a.question_id) ' +
        'where q.answerner_id =1 and month(a.date) = (select month(now())))c ' +
        'on (b.answernerId = c.answernerId)';
    dbPool.logStatus();
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [id], function(err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            callback(null, results[0]);
        });
    });
}

// 내 프로필 스트리밍
function streamingMyProfile(id, callback) {
    var sql = 'select voice_message voiceMessage from user where id = ? ';

    dbPool.logStatus();
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [id], function(err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            var filename =results[0].voiceMessage;
            console.log(filename);
            results[0].fileurl = url.resolve('http://127.0.0.1:80', '/avs/' +filename);
            callback(null, results[0]);
        })
    })
}

// 상대방 프로필 스트리밍
function streamingYourProfile(uid, callback) {
    var sql = 'select voice_message voiceMessage from user where id = ? ';

    dbPool.logStatus();
    dbPool.getConnection(function(err, dbConn) {
        if (err) {
            return callback(err);
        }
        dbConn.query(sql, [uid], function(err, results) {
            dbConn.release();
            dbPool.logStatus();
            if (err) {
                return callback(err);
            }
            var filename =results[0].voiceMessage;
            console.log(filename);
            results[0].fileurl = url.resolve('http://127.0.0.1:80', '/avs/' +filename);
            callback(null, results[0]);
        })
    })

}



module.exports.findUser = findUser;
module.exports.findOrCreate = findOrCreate;
module.exports.searchRecommend = searchRecommend;
module.exports.checkNickname = checkNickname;
module.exports.showMyInfo = showMyInfo;
module.exports.showYourInfo = showYourInfo;
module.exports.recommendFollowing = recommendFollowing;
module.exports.donationRank = donationRank;
module.exports.updateProfile = updateProfile;
module.exports.updatePhoto = updatePhoto;
module.exports.deletePhoto = deletePhoto;
module.exports.updateDonation = updateDonation;
module.exports.searchUser = searchUser;
module.exports.registerFollow = registerFollow;
module.exports.cancleFollow = cancleFollow;
module.exports.showMySendQuestions = showMySendQuestions;
module.exports.showMyReceiveQuestions = showMyReceiveQuestions;
module.exports.showMyFollowing = showMyFollowing;
module.exports.showMyFollower = showMyFollower;
module.exports.showYourFollowing = showYourFollowing;
module.exports.showYourFollower = showYourFollower;
module.exports.showYourSendQuestions = showYourSendQuestions;
module.exports.showYourReceiveQuestions = showYourReceiveQuestions;
module.exports.showDonationPoint = showDonationPoint;
module.exports.showSavedPoint = showSavedPoint;
module.exports.streamingMyProfile = streamingMyProfile;
module.exports.streamingYourProfile = streamingYourProfile;
module.exports.chargePoint = chargePoint;
module.exports.withdrawPoint = withdrawPoint;