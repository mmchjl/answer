/**
 * Created with JetBrains WebStorm.
 * User: NL_LE
 * Date: 13-5-20
 * Time: 下午1:53
 * To change this template use File | Settings | File Templates.
 */

var child,
    redisSession,
    http = require("http"),
    url = require("url"),
    query = require("querystring"),
    util = require("util");

var config = {
    sessionMode:configuration.config.runtime.sessionMode//0为进程内，1为进程外，2为redis
};

if(config.sessionMode==1){
    child = require("child_process").fork("./lib/sessionState.js");
}else if(config.sessionMode==2){
    redisSession = require("./sessionStateRedis.js");
}

function getSession(sessionId,callback){
    var operation = "get";
    if(sessionId instanceof Function){
        callback = sessionId;
        sessionId = utility.Guid("n");
        operation = "update";
    }
    var session = {
        sessionId:sessionId,
        operation:operation,
        session:{}
    };
    switch(config.sessionMode){
        case 0:
            var temp = _operation(session);
            callback(temp);
            break;
        case 1:
            child.once("message",function(msg){
                callback(msg);
            });
            child.send(session);
            break;
        case 2:
            redisSession.operation(session,callback);
            break;
    }
}

function setSession(session,callback){
    if(session){
        session.operation = "update";
        switch(config.sessionMode){
            case 0:
                _operation(session);
                break;
            case 1:
                child.send(session);
                break;
            case 2:
                redisSession.operation(session,callback);
                break;
        }
        //child.send(session);
    }else{
        throw new Error("setSession exception due to session is undefined");
    }
}

function remove(sessionId){
    if(sessionId){
        var session = {};
        session.sessionId = sessionId;
        session.operation = "clear";
        switch(config.sessionMode){
            case 0:
                _operation(session);
                break;
            case 1:
                child.send(session);
                break;
            case 2:
                break;
        }
        //child.send(session);
    }else{
        throw new Error("remove session exception due to sessionId is undefined");
    }
}

module.exports.getSession = getSession;
module.exports.setSession = setSession;
module.exports.remove = remove;



var sessionArray = [];
function _remove(){
    var len = sessionArray.length,
        timeNow = (new Date()).getTime(),
        removeTime = timeNow - configuration.config.runtime.sessionExpireTime*1000;
    if(len>0){
        //console.dir(sessionArray);
        sessionArray = sessionArray.FindAll(function(item){
            return item.updateTime>=removeTime;
        });
    }
}
if(config.sessionMode==0){
    setInterval(_remove,10*1000);
}

function _operation(msg){
    var sessionId = msg.sessionId,
        session = msg.session,
        operation = msg.operation;
    var temp;
    switch (operation){
        case "get":
            temp = sessionArray.Find(function(obj){
                return obj.sessionId == sessionId;
            });
            if(temp){
                temp.updateTime = (new Date()).getTime();
                return temp;
            }else{
                return null;
            }
            break;
        case "clear":
            sessionArray = sessionArray.FindAll(function(obj){
                return obj.sessionId != sessionId;
            });
            break;
        case "update":
            temp = sessionArray.Find(function(obj){
                return obj.sessionId == sessionId;
            });
            if(temp){
                //更新
                temp.session = session;
                temp.updateTime = (new Date()).getTime()
            }else{
                //插入
                if(!sessionId){
                    return;
                }
                temp = {
                    sessionId:sessionId,
                    session:session,
                    addTime:(new Date()).getTime(),
                    updateTime:(new Date()).getTime()
                };
                sessionArray.push(temp);
            }
            return temp;
            break;
    }
}