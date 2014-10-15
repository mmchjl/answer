/*
 *MongdbConnect.js 是通用连接池 mongodb 数据库连接文件
 *
 *输出2个函数
 *
 *1、exports = fn，封装好的连接池函数（建议使用）
 *
 *2、exports.mpool 未封装的连接池函数（不建议使用）
 *
 */

var poolModule = require('generic-pool'),
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    ReplSetServers = mongodb.ReplSetServers,
    Connection = mongodb.Connection,
    Server = mongodb.Server,
    connect  = mongodb.pure().connect,//字符串式连接
    defaultdbname = configuration.config.mongodb.dbname,
    host = configuration.config.mongodb.server,
    port = configuration.config.mongodb.port,
    connectString = configuration.config.mongodb.connectString,
    hostarray = [],
	openTime= 0,
    dbopen = function(callback, dbname){
        if(connectString){		//字符串连接mongodb数据库
            //var str = dbname || connectString;
            connect(connectString,{
                uri_decode_auth:true
            }, function(err, db){
                callback(err, db);
                console.log("MONGODB CONNECTION OPEN!!");
            })
        }
        else if(false){
            var ServerArray =  [];
            hostarray.forEach(function(v,i){
                var	ser = new Server(v.ip, v.port, {auto_reconnect: true});
                ServerArray.push(ser);
            });
            var dbname = dbname || defaultdbname,
                replSet = new ReplSetServers(ServerArray,{rs_name:MongodbRC,read_secondary:true,socketOptions:{}}),
                client = new Db(dbname, replSet,{});
            client.open(function(err, db){

                callback(err, db);
            });
        }
        else{ //ip 和 端口 连接数据库
            var dbname = dbname || defaultdbname;
            dbserver =  new Server(host,port, {poolSize:1, auto_reconnect:false}),
            client = new Db(dbname, dbserver, {safe:true});
            client.open(function(err, db){
                openTime++;
                console.log("------------------------------clietn.open调用次数:"+openTime+" TIME:"+(new Date()).format("hh:mm:ss"));
                callback(err, db);
            })
        }
    };

if(true){  //如果开启 mongodb 连接
    if(false){//如果使用的是mongodb副本集的连接,分割ip和端口并验证数据格式
/*        _restConfig.MongodbRChost.forEach(function(v,i){
            var vary = v.split(':');
            hostarray.push({ip:vary[0],port:(vary[1]-0)||27017});
        });*/
    }

    var  mpool = poolModule.Pool({
        name     : 'mongodb',
        create   : function(callback, dbname){
            dbopen(callback, dbname);
        },
        destroy  : function(db) { db.close(); }, //当超时则释放连接
        max      : 1,   //最大连接数
        idleTimeoutMillis : 1000*60,//连接失效时间
        log : false
    });


    module.exports = function(callback, priority ){
        mpool.acquire(function(err, db){
            var release = function(){mpool.release(db);}; //设置归还连接的函数
            var genid = function(id){return mgenid(db, id)};
            if(err){
                utility.handleException(err);
                release();
                callback(err);
            }
            callback(err, db, release, genid);
        }, priority)
    }
    module.exports.mpool = mpool;
    /*
     生成mongodb _id的方法
     */
    var mgenid =  module.exports.mgenid = function(db, id){
        try{
            return  db.bson_serializer.ObjectID.createFromHexString(id.toString());
        }
        catch(e){
            return false;
        }
    }
}
else{
    module.exports = module.exports.mpool = function(){
       /* outerror(msg.errmsg.dbConfigError);//提示用户打开mongodb配置*/
        console.log("请打开mongodb配置");
    };
}
