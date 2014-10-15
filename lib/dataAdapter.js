/**
 * Created by Administrator on 2014/6/15.
 */

var mongodb = require("./mongoClient.js"),
    redis = require("./redis.js"),
    async = require("async"),
    _util = require("./comLib.js").util,
    Grid = require("mongodb").Grid;

var count = 0;

var ANSWERLIST = "AList";

var STATISTICS =[];

function initData(collection,hashField,expireTime){
    if(!collection||!hashField){
        return;
    }
    var tempHash = collection;
    mongodb.mongo(function(err,client,release,genid){
        if(err){
            release();
        }else{
            client.collection(collection,function(err,col){
                if(err){
                    release();
                }else{
                    //console.time("a");
                    col.find(function(_err,_cur){
                        _cur.nextObject(iterate.bind({
                            cur:_cur,
                            release:release,
                            hashField:hashField
                        }));
                    });
                }
            });
        }
    })
}

function setData(collection,key,hash,newObject,callback){
    var tempHash = "";
    if(key instanceof Array){
        tempHash = hash.join("_");
    }else{
        tempHash = collection+"_"+hash;
    }
    async.parallel({
        redis:function(cb){
            var keys = Object.keys(newObject);
            var tempNewObject = {};
            keys.forEach(function(key){
                if(typeof(newObject[key])=="object"){
                    tempNewObject[key] = JSON.stringify(newObject[key]);
                }else{
                    tempNewObject[key] = newObject[key];
                }
            })
            redis.hMSet(tempHash,tempNewObject,function(data){
                 cb(null,data);
                redis.expire(tempHash,500)
            })
        },
        mongodb:function(cb){
            var opt = {
                collection:collection,
                query:{},
                newObject:{$set:newObject}
            };
            if( key instanceof Array){
                for(var i=0;i<key.length;i++){
                    opt.query[key[i]]=hash[i];
                }
            }else{
                opt.query[key]=hash;
            }
            mongodb.upsert(opt,function(err,data){
                if(err){
                    cb(err,undefined);
                }else{
                    cb(err,data);
                }
            })
        }
    },function(err,result){
        if(err){
            console.error(err.message)
            if(callback)
                callback(result);
        }else{
            //console.dir(result);
            if(callback)
                callback(result);
        }
    });
}

function getData(collection,key,hash,callback){
    var tempHash = "";
    if(key instanceof Array){
        tempHash = hash.join("_");
    }else{
        tempHash = collection+"_"+hash;
    }
    async.waterfall([
        function(cb){//getFromRedis
            redis.hGetAll(tempHash,function(data){
                //utility.debug("get date from redis:",JSON.stringify(data));
                cb(null,data);
            })
        },
        function(lastResult,cb){//getFromMongoDb
            if(lastResult){
                cb(null,lastResult,false);
                //utility.debug("skip the dbsave part");
            }else{
                //utility.debug("need to get the data from db");
                var opt={
                    collection:collection,
                    query:{
                        //C_id:hash
                    }
                };
                if(key instanceof Array){
                    for(var i=0;i<key.length;i++){
                        opt.query[key[i]]=hash[i];
                    }
                }else{
                    opt.query[key]=hash;
                }
                mongodb.findOne(opt,function(err,data){
                    //utility.debug("get the data finish and ready flush to redis");
                    cb(null,data,true);
                })
            }
        },
        function(lastResult,isNeedSetToRedis,cb){
            if(isNeedSetToRedis&&lastResult){
                var keys = Object.keys(lastResult);
                keys.forEach(function(key){
                    if(typeof(lastResult[key])=="object"){
                        lastResult[key] = JSON.stringify(lastResult[key]);
                    }else{
                        lastResult[key] = lastResult[key];
                    }
                })
                redis.hMSet(tempHash,lastResult,function(){
                    cb(null,lastResult);
                    redis.expire(tempHash,500)
                })
            }else{
                cb(null,lastResult);
            }
        }
    ],function(err,result){
        //utility.debug("Finsh");
        callback(result);
    });
}

function iterate(err,item){
    var bindObj = this;
    if(err||!item){
        if(err){
            console.log(err.message);
        }
        bindObj.cur.close();
        bindObj.release();
        console.log(count);
    }else{
        //console.dir(item)
        redis.hMSet(item[bindObj.hashField].toString(),item,function(data){
            //console.log("Success insert into redis :"+data);
            console.log("Current Count"+count++);
        })
        bindObj.cur.nextObject(iterate.bind(this))

    }
}

function pushToWaitForAnswerList(gQuestion,cb){
    var type = gQuestion.gItemType||"1";
    var listName = ANSWERLIST;
    if(configuration.config.isActiveFenTi){
        listName = ANSWERLIST+type;
    }
    redis.redis().rpush([listName,gQuestion],function(err,result){
        if(configuration.config.isActiveFenTi){
            var temp = STATISTICS.filter(function(item){return item.listName==listName})[0];
            if(temp){
                temp.length= (temp.length||0)+1;
            }else{
                STATISTICS.push({
                    listName:listName,
                    length:1,
                    type:type
                })
            }
        }
        if(cb){
            cb(err,result);
        }
    });
}

function leftPushToWaitForAnswerList(gQuestionNo,cb){
    redis.redis().lpush([ANSWERLIST,gQuestionNo],function(err,result){
        if(cb) cb(err,result);
    });
}

function popNeedToAnswerQuestion(types,cb){
    if(typeof(types)=="function") {
        cb = types;
        types=[];
    }
    var listName = ANSWERLIST;
    if(configuration.config.isActiveFenTi) {
        if (STATISTICS.length == 0) {
            cb(null);
        }
        if (types.length == 1) {
            if (types[0]) {
                listName = ANSWERLIST + types[0];
            } else {
                var temp = STATISTICS.sort(function (a, b) {
                    return a.length > b.length ? -1 : 1;
                })[0];
                if (temp) {
                    listName = temp.listName;
                } else {
                    cb(null);
                }
            }
        } else {
            var tempArr = STATISTICS.filter(function (item) {
                return types.indexOf(item.type) >= 0;
            })
            var temp = tempArr.sort(function (a, b) {
                return a.length > b.length ? -1 : 1;
            })[0];
            if (temp) {
                listName = temp.listName;
            } else {
                cb(null);
            }
        }
    }
    redis.redis().lpop([listName],function(err,result){
        if(configuration.config.isActiveFenTi&&result){
            var temp = STATISTICS.filter(function(item){return item.listName==listName})[0];
            if(temp){
                temp.length= (temp.length||0)-1;
            }
        }
        cb(result);
    });
}

function expire(collecion,hash,expireTime,cb){
    if(!expireTime){
        expireTime = 3*60;
    }
    var key = collecion+"_"+hash;
    redis.expire(key,expireTime,function(result){
        if(cb) cb(result);
    })
}

function getWaitingQuestionListLength(cb){
    if(configuration.config.isActiveFenTi){
        if(cb) cb(STATISTICS);
    }else{
        redis.redis().llen([ANSWERLIST],function(err,result){
            cb([{
                "listName":ANSWERLIST,
                "length":result||0
            }]);
        })
    }

}

function removeData(collection,key,hash,cb){
    async.parallel([
        function(callback){
            var temphash = collection+"_"+hash;
            redis.del(temphash,callback);
        },
        function(callback){
            var opt={
                collection:collection,
                query:{}
            };
            opt.query[key]=hash;
            mongodb.remove(opt,callback);
        }
    ],function(err,result){
        if(cb) cb(err,result);
    });
}

function gUserTotalSetCredits(uid,questionDate,credits,mode){
    //mode:1:正常答题 -1超时TimeOut -2未知Unkown -3答案报错
    var date = new Date(parseInt(questionDate));
    var today = _util.today().toString();
    var hour = date.getHours();
    async.waterfall([
        function(cb){
            getData("gUserTotal",["QuestionDate","UserNo"],[today,uid],function(result){
                cb(null,result);
            })
        },
        function(result,cb){
            if(result){
                var obj = {};
                var answerTime = "AQtyTime"+hour;
                var answerShift = "AQtyTime"+getShifts(hour);
                switch (mode){
                    case  _util.Status.Answered:
                        obj.QuestionCount =1;
                        obj.QuestionCredits = credits;
                        obj[answerTime] =  1;;
                        obj[answerShift] =  1;
                        break;
                    case  _util.Status.TimeOut:
                        obj.QuestionCount = 1;
                        obj.QuestionCredits = credits;
                        obj.TimeOutCount = 1;
                        obj.TimeOutCredits =  credits;
                        obj[answerTime] = 1;
                        obj[answerShift] = 1;
                        break;
                    case  _util.Status.Unknown:
                        obj.QuestionCount = 1;
                        obj.QuestionCredits =  credits;
                        obj.NotSureCount =+1;
                        //obj.TimeOutCredits = parseInt(result.TimeOutCredits) + credits;
                        obj[answerTime] = 1;;
                        obj[answerShift] =  1;
                        break;
                    case  _util.Status.Error:
                        obj.ReportErrorCount = 1;
                        obj.ReportErrorCredits =  credits;
                        break;
                }
                gUserTotalSetCredits_(uid,obj)
            }else{
                var newgUserTotal = _util.createUserTotal();
                newgUserTotal.UserNo = uid;
                newgUserTotal.QuestionCount = 1;
                newgUserTotal.QuestionCredits=credits;
                newgUserTotal["AQtyTime"+hour]=1;
                newgUserTotal["AQtyTime"+getShifts(hour)]=1;
                switch (mode){
                    case _util.Status.TimeOut:
                        newgUserTotal["TimeOutCount"]=1;
                        newgUserTotal["TimeOutCredits"]=credits;
                        break;
                    case _util.Status.Unknown:
                        newgUserTotal["NotSureCount"]=1;
                        break;
                }
                setData("gUserTotal",["QuestionDate","UserNo"],[today,uid],newgUserTotal)
            }
        }
    ]);

}

function gUserTotalSetCredits_(uid,fields,callback){
    var today = _util.today().toString();
    var hash = today+"_"+uid;
    var arr=[];
    var keys = Object.keys(fields);
    keys.forEach(function(key){
        arr.push([
            "HINCRBY",
            hash,
            key,
            fields[key]
        ]);
    })
    var collection = "gUserTotal";
    async.parallel({
        redis:function(cb){
            redis.redis().multi(
                arr
            ).exec(function(err,result){
                cb(null,result);
            });
        },
        mongodb:function(cb){
            var opt={
                collection:collection,
                query:{
                    UserNo:uid,
                    QuestionDate:today
                },
                newObject:{
                    $inc:fields
                }
            };
            mongodb.update(opt,function(err,result){
                cb(err,result);
            })
        }
    },function(err,result){
        if(err){
            utility.handleException(err);
            if(callback) return callback(null);
        }
        if(callback) callback(result);
    });
}

function gUserCreditUpdate(uid,field,credits,callback){
    var hash = "gUser_"+uid;
    async.parallel({
        redis:function(cb){
            redis.redis().HINCRBY([
                hash,field,credits
            ],function(err,result){
//                console.dir({
//                    err:err,
//                    result:result
//                });
                cb(null,result);
            })
        },
        mongodb:function(cb){
            var opt={
                collection:"gUser",
                query:{
                    UserNo:uid
                },
                newObject:{
                    $inc:{
                    }
                }
            };
            opt.newObject.$inc[field]=credits;
            mongodb.update(opt,function(err,result){
                cb(err,result);
            })
        }
    },function(err,result){
        if(err){
            utility.handleException(err);
            if(callback) return callback(null);
        }
        if(callback) callback(result);
    });

}


function checkAnswerAndSetToList(question,md5){
    getData("gImageMd5Rec","ImageMd5",md5,function(data){
        if(data&&data.sAnswer){
            //答案库里面取到数据，设置答案
            setData("gQuestion","QuestionNO",question.QuestionNO,{
                sAnswer:data.sAnswer,
                AnswerDate:(new Date()).getTime(),
                AnswererId:"system",
                Status:_util.Status.Answered
            });

            var qUser = question.QuesterId||"";
            //var aUser = question.AnswererId||"";
            var qCredit = parseInt(question.TakeCredits)||0;
            var aCredit = parseInt(question.AnswerCredits)||0;
            var gItemNo = question.gItemNo||"";
            var date = new Date(parseInt(question.QuestionDate));
            var today =_util.today().toString();//question.QuestionDate;
            getData("gUser","UserNo",qUser,function(user){
                if(user){
                    var newObj = {
                        QuestionCredits:(parseInt(user.QuestionCredits)||0)-qCredit
                    };
                    setData("gUser","UserNo",qUser,newObj);
                }
            });//md5答案库存在答案 gUser表 问题者要减分

            gUserTotalSetCredits(qUser,question.QuestionDate,qCredit,_util.Status.Answered);//问题者 每日积分统计(gUserTotal)
            gUserTotalSetCredits("system",question.QuestionDate,aCredit,_util.Status.Answered);//答题者(ansayServer) 每日积分统计(gUserTotal)
            //Todo: gRebate也要统计

            var opt={
                collection:"gRebate",
                query:{
                    gItemNo:gItemNo.toString(),
                    QuestionDate:today,
                    gItemTypeOwner:"system"
                },
                newObject:{
                    $inc:{
                        QuestionCount:1,
                        ReportErrorCount:0,
                        TimeOutCount:0
                    }
                }
            };
            mongodb.upsert(opt,function(err,result){
            })

            setData("gImageMd5Rec","ImageMd5",md5,{
                "LastUseTime" : (new Date()).getTime()
            });
        }else{
            //答案库里面没有数据，压入待答队列
            pushToWaitForAnswerList(question.QuestionNO)
        }
    });
}

function removePassQuestion(timeTicks,cb){
    timeTicks = timeTicks||500;
    var now = new Date().getTime();
    var spera = now - timeTicks*1000;
    var opt={
        collection:"gQuestion",
        query:{
            QuestionDate:{
                $lt:spera
            }
        },
        fields:{
            _id:0,
            QuestionNO:1,
            imgId:1,
            Status:1
        },
        pageSize:100,
        sort:[
            ["QuestionDate","ascending"]
        ]
    };
    mongodb.query(opt,function(err,result){
        if(err){
            utility.handleException(err);
        }
        if(result) {
//            var needDelete = result.filter(function(item){return item.Status==1;});
//            var needrecord = result.filter(function(item){return item.Status!=1;});
//            async.forEach(needDelete,_removeQuestion,function(err){
//                if(cb) cb(null,null);
//            });
//            async.forEach(needrecord,_recordQuestionData,function(err){
//                if(err) utility.handleException(err);
//            });
            async.forEach(result,_removeQuestion,function(err){
                if(cb) cb(null,null);
            });
        }else{
            if(cb) cb(null,null);
        }
    })
}

function runForever(funs,intervel){
    async.parallel(funs,function(err,result){
        if(err){
            utility.handleException(err);
        }
        //console.log("Run a time "+(new Date()).toJSON());
        setTimeout(runForever,intervel||1000,funs,intervel)
    });
}

function loadPage(opt,callback){
    async.parallel({
        size:function(cb){
            mongodb.count(opt,function(err,len){
                if(err) utility.handleException(err);
                cb(null,len||0);
            })
        },
        list:function(cb){
            mongodb.query(opt,function(err,result){
                if(err){
                    utility.handleException(err);
                }
                result=result||[];
                cb(null,result);
            })
        }
    },function(err,result){
        if(err) utility.handleException(err);
        if(callback) callback({
            result:result.list,
            size:result.size
        })
    });
}

function setBackUpQuestion(question,questionNo){
    if(!question.QuestionNO&&questionNo) question.QuestionNO = questionNo;
    if(!question.QuestionNO) return;
    var opt={
        collection:"gQuestionBackUp",
        query:{
            QuestionNO:question.QuestionNO
        },
        newObject:{
            $set:question
        }
    };
    mongodb.upsert(opt)
}

function setQuestionTimeOut(question){
    var qUser = question.QuesterId||"";
    var aUser = question.AnswererId||"";
    var qCredit = parseInt(question.TakeCredits)||0;
    var aCredit = parseInt(question.AnswerCredits)||0;
    var gItemNo = question.gItemNo||"";
    var today =_util.today().toString();
    var QuestionNO = question.QuestionNO;
    var newObj = {
        Status:_util.Status.TimeOut,//0:待答 1:已回答 2:正在回答 -1:未知Unknown  -4:超时
        AnswererId : aUser||"system",
        AnswerDate : new Date().getTime(),
        sAnswer:"#TimeOut",
        TakeCredits:0
    };
    var opt={
        collection:"gRebate",
        query:{
            gItemNo:gItemNo.toString(),
            QuestionDate:today,
            gItemTypeOwner: question.gItemTypeOwner
        },
        newObject:{
            $inc:{
                QuestionCount:1,
                ReportErrorCount:0,
                TimeOutCount:1
            },
            $set:{
                Credit: parseInt(question.TakeCredits)||0,
                Discount:parseFloat(question.Discount)||0
            }
        }
    };
    qCredit=0;
    aCredit=0;
    //todo comment out
    //console.log("此操作有question端设定题目超时");

    setData("gQuestion","QuestionNO",QuestionNO,newObj);
    setBackUpQuestion(newObj,QuestionNO);

    getData("gUser","UserNo",qUser,function(user){
        if(user){
            gUserCreditUpdate(user.UserNo,"QuestionCredits",-qCredit);
        }
    });//gUser表 问题者
    gUserTotalSetCredits(qUser,question.QuestionDate,qCredit,newObj.Status);//gUserTotal表 问题者积分

    if(aUser){
        getData("gUser","UserNo",aUser,function(user){
            if(user){
                gUserCreditUpdate(user.UserNo,"AnswerCredits",aCredit);
            }
        });//gUser表 答题者
        gUserTotalSetCredits(aUser,question.QuestionDate,aCredit,newObj.Status);//gUserTotal表 回答者积分
    }
    if(question.UserType==_util.userType.SubQuestionUser){
        mongodb.upsert(opt)
    }
    redis.redis().lrem([ANSWERLIST,0,QuestionNO],function(){});
}

function getQesterRebateCredit(quester,callback){
    async.parallel({
            historyCredits:function(cb){
            var opt={
                collection:"gUser",
                query:{
                    UserNo:quester
                }
            };
            mongodb.findOne(opt,function(err,user){
                if(err||!user){
                    return cb(true);
                }else{
                    cb(null,user.HistoryCredits||0);
                }
            })
        },
        rebateCredit:function(cb){
            var opt = {
                collection:"gRebate",
                query:{
                    gItemTypeOwner:quester
                },
                fields:{
                    _id:-1,
                    QuestionCount:1,
                    ReportErrorCount:1,
                    TimeOutCount:1,
                    Credit:1,
                    Discount:1
                },
                pageSize:0
            };
            mongodb.query(opt,function(err,result){
                if(err) return cb(err);
                var sum = 0;
                result.forEach(function(item){
                    sum+=((item.QuestionCount||0)-(item.ReportErrorCount||0)-(item.TimeOutCount||0))*(item.Credit||0)*(item.Discount||0)
                })
                sum = Math.floor(sum);
                cb(null,sum);
            })
        }},
        function(err,result){
            if(err&&callback) return callback(err);
            var res = result.rebateCredit - result.historyCredits;
            if(callback) callback(null,res);
        });
}

//获取当时班次
function getShifts(hours){
    if(hours>=0&&hours<4){
        return "A"
    }else if(hours>=4&&hours<8){
        return "B"
    }else if(hours>=8&&hours<12){
        return "C"
    }else if(hours>=12&&hours<16){
        return "D"
    }else if(hours>=16&&hours<20){
        return "E"
    }else{
        return "F"
    }
}

module.exports.initData = initData;
module.exports.setData = setData;
module.exports.getData = getData;
module.exports.removeData = removeData;
module.exports.expire = expire;
module.exports.pushToWaitForAnswerList = pushToWaitForAnswerList;
module.exports.leftPushToWaitForAnswerList = leftPushToWaitForAnswerList;
module.exports.popNeedToAnswerQuestion = popNeedToAnswerQuestion;
module.exports.gUserTotalSetCredits = gUserTotalSetCredits;
module.exports.getWaitingQuestionListLength = getWaitingQuestionListLength;
module.exports.checkAnswerAndSetToList = checkAnswerAndSetToList;
module.exports.removePassQuestion=removePassQuestion;
module.exports.runForever=runForever;
module.exports.loadPage=loadPage;
module.exports.gUserCreditUpdate = gUserCreditUpdate;
module.exports.setBackUpQuestion = setBackUpQuestion;
module.exports.setQuestionTimeOut = setQuestionTimeOut;
module.exports.getQesterRebateCredit=getQesterRebateCredit;

function _removeQuestion(obj,cb){
    var imgId = obj.imgId||"_";
    var questionNO = obj.QuestionNO||"_";
    var status = obj.Status;
    async.parallel({
//        mongoFile:function(_cb){
//            mongodb.mongo(function(err,db,release,genid){
//                var grid = new Grid(db,"fs");
//                grid.delete(genid(imgId),function(err,data){
//                    if(err){
//                        utility.handleException(err);
//                    }
//                    release();
//                    _cb(err,data);
//                })
//            })
//        },
        mongoAndRedis:function(_cb){
            removeData("gQuestion","QuestionNO",questionNO,_cb)
        }
    },function(err,result){
        if(cb) cb();
    });
}



