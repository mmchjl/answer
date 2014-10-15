var server = require("./server.js");
var util = require("util");
//var cluster = require("cluster");
var os = require("os");
var redis =require("./lib/redis.js");
var fork =require("child_process").fork;
//console.log(global.configuration);
if(configuration.config.runtime.isOpenUnCaughtException){
    process.on("uncaughtException",function(err){
        utility.handleException(err);
    });
}

var forkProcess;

var forkFilePath = "./test.js";

//if(cluster.isMaster){
//    for(var i=0;i<os.cpus().length;i++){
//        cluster.fork()
//    }
    redis.runRedis();
    forkProcess = fork(forkFilePath);
//    console.log("Server Start");
//}else{
    server.listen(configuration.config.runtime.appport);
//}



