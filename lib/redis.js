/**
 * Created with JetBrains WebStorm.
 * User: LE
 * Date: 13-5-5
 * Time: 下午4:03
 * To change this template use File | Settings | File Templates.
 */

var redis = require("redis"),
    exec = require('child_process').exec,
    path = require("path"),
    child,
    client;

exports.redis = function(){
    try
    {
        if(!client){
            console.info("call createClient");
            client = redis.createClient();
            client.auth(configuration.config.redis.password);
        }
        return client;
    }catch(e){
        utility.handleException(e)
    }
}

exports.hGetAll = function(key,callback){
    exports.redis().hgetall(key,function(err,data){
        if(err){
            utility.handleException(err);
        }
        callback(data);
    });
}

exports.hMSet = function(hash,obj,callback){
    if(utility.isNull(obj)){
        obj={
            _a:-1
        };
    }
    if(Object.keys(obj).length==0){
        obj={
            _a:0
        };
    }
    exports.redis().hmset(hash,obj,function(err,_data){
        if(err){
            utility.handleException(err);
        }
        if(callback)  callback(_data);
    })
}

exports.expire =function(key,time,callback){
    exports.redis().expire(key,time,function(err,result){
       if(err){
           utility.handleException(err);
       }
      if(callback) callback(result);
   });
}

exports.init  = function init(filepath){
    child = exec(filepath,{
        //cwd:"D:\\redis\\redisbin_x32\\",
        cwd:path.dirname(configuration.config.redis.filepath)
    },function(err,stdout,stderr){
        if(err){
            utility.debug(err.message);
        }else{
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
        }
    });
    /*
    * Event: 'error'
     Event: 'exit'
     Event: 'close'
     Event: 'disconnect'
     Event: 'message'
    *
    * */
    child.on("error",function(){
        console.log("error")
    })
    child.on("exit",function(){
        console.log("exit")
    })
    child.on("close",function(){
        console.log("close")
    })
    child.on("disconnect",function(){
        console.log("disconnect")
    })
    child.on("message",function(){
        console.log("message")
    })
}

exports.del = function(key,callback){
    exports.redis().del(key,function(err,_data){
        if(err){
            utility.handleException(err);
        }
        if(callback)  callback(err,_data);
    })
}

exports.runRedis = runRedis;

function runRedis(){
    if(configuration.config.runtime.sessionMode==2){
        exports.init(configuration.config.redis.filepath);
        client= redis.createClient();
        client.config(["set",
            "requirepass",configuration.config.redis.password
        ],function(err,data){
            if(err){
                console.error(err.message);
            }else{
                client.auth(configuration.config.redis.password);
                console.log("Init Redis Success......");
            }
        });
    }
}
