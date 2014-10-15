/**
 * Created with JetBrains WebStorm.
 * User: LE
 * Date: 13-6-10
 * Time: 下午8:23
 * To change this template use File | Settings | File Templates.
 */

var redis = require("./redis.js");


function operation(msg,callback){
    var sessionId = msg.sessionId,
        session = msg.session,
        operation = msg.operation;
    switch (operation){
        case "get":
            redis.hGetAll(sessionId,function(data){
                if(data==null){
                    callback(null);
                }else{
                    redis.expire(sessionId,configuration.config.runtime.sessionExpireTime);
                    callback({
                        sessionId:sessionId,
                        session:data
                    });
                }
            })
            break;
        case "clear":

            break;
        case "update":
            redis.hMSet(sessionId,session,function(data){
               if(callback&&data){
                   redis.expire(sessionId,configuration.config.runtime.sessionExpireTime);
                   callback({
                       sessionId:sessionId,
                       session:session
                   });
               }
            });
            break;
    }
}

module.exports.operation = operation;