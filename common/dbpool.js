var mysql = require('mysql');
var logger = require('./logger');

var dbPoolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
};

var dbPool = mysql.createPool(dbPoolConfig);

dbPool.logStatus = function() {
  logger.log('debug', 'dbpool : current free %d conns/ %d conns in a database pool',
    dbPool._freeConnections.length,
    dbPool._allConnections.length
  );
};

dbPool.on('connection', function(connection) {
  logger.log('debug', 'connection event : free %d conns/ %d conns in a database pool',
    dbPool._freeConnections.length,
    dbPool._allConnections.length
  );
});

dbPool.on("enqueue", function() {
  logger.log('debug', 'enque event : total %d waiting conns in a queue',
    dbPool._connectionQueue.length
  );
});

module.exports = dbPool;