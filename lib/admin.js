/**
 * Created by Administrator on 2014/7/12.
 */

var dal = require("./dataAdapter.js"),
    async = require("async"),
    fs = require("fs"),
    mongodb  = require("../lib/mongoClient.js"),
    redis = require("./redis.js"),
    Grid = require("mongodb").Grid,
    path = require("path"),
    _util = require("./comLib.js").util;

function main(postString,header,response){
    if(!postString){
        return response.end();
    }
    if(!header.auth) {
        return response.endJson({
            err:403,
            msg:"未登录或者登录超时",
            redirectTo:"#/login"
        })
    };
    var userType = header.getSession("User").UserType;
    if(userType!=_util.userType.Admin){
        return response.endJson({
            err:403,
            msg:"无权限访问此页面",
            redirectTo:"#/login"
        })
    }
    if(postString.indexOf("generateCard;")>=0){
        _handler.generateCard(postString,header,response)
    }else if(postString.indexOf("userLoginByA;")>=0){
        _handler.userLoginByA(postString,header,response)
    }else if(postString.indexOf("GetRegistStatisticsInfo;")>=0){
        _handler.getRegistStatisticsInfo(postString,header,response)
    }else if(postString.indexOf("GetMd5ImageState;")>=0){
        _handler.getMd5ImageState(postString,header,response)
    }else if(postString.indexOf("GetImageCollectionState;")>=0){
        _handler.getImageCollectionState(postString,header,response)
    }else if(postString.indexOf("GetRunStats;")>=0){
        _handler.getRunState(postString,header,response)
    }else if(postString.indexOf("userIdCheckExists;")>=0){
        _handler.userIdCheckExists(postString,header,response)
    }else if(postString.indexOf("userRegister;")>=0){
        _handler.userRegister(postString,header,response)
    }else if(postString.indexOf("getQuestionTypeList;")>=0){
        _handler.getQuestionTypeList(postString,header,response)
    }else if(postString.indexOf("removeQuestionType;")>=0){
        _handler.removeQuestionType(postString,header,response)
    }else if(postString.indexOf("updateQuestionType;")>=0){
        _handler.updateQuestionType(postString,header,response)
    }else if(postString.indexOf("getUserList;")>=0){
        _handler.getUserList(postString,header,response)
    }else if(postString.indexOf("disabledUser;")>=0){
        _handler.disabledUser(postString,header,response)
    }else if(postString.indexOf("resetMac;")>=0){
        _handler.resetMac(postString,header,response)
    }else if(postString.indexOf("getProblemQuestion;")>=0){
        _handler.getProblemQuestion(postString,header,response)
    }else if(postString.indexOf("updateUserInfo;")>=0){
        _handler.updateUserInfo(postString,header,response)
    }else if(postString.indexOf("getRebateList;")>=0){
        _handler.getRebateList(postString,header,response)
    }else if(postString.indexOf("reCharge;")>=0){
        _handler.reCharge(postString,header,response)
    }else if(postString.indexOf("getCardList;")>=0){
        _handler.getCardList(postString,header,response)
    }else if(postString.indexOf("removeCard;")>=0){
        _handler.removeCard(postString,header,response)
    }else if(postString.indexOf("getDepositStatus;")>=0){
        _handler.getDepositStatus(postString,header,response)
    }else if(postString.indexOf("deposit;")>=0){
        _handler.deposit(postString,header,response)
    }else{
        response.end();
    }
}

var _handler = {
    generateCard:function(postString,header,response){
        var price =  _util.getQueryString(postString,"price")||0;
        var gcard = _util.createCard();
        if(price&&!isNaN(price)){
            gcard.CardPrice = parseInt(price);
            var opt={
                collection:"gCard",
                newObject:gcard
            };
            if(gcard.CardPrice){
                mongodb.insert(opt,function(err,result){
                    if(result){
                        response.endJson({
                            err:0,
                            result:result[0].CardNo
                        });
                    }else{
                        response.endJson({
                            err:1,
                            msg:"服务器内部错误"
                        });
                    }
                })
            }else{
                response.endJson({
                    err:1,
                    msg:"卡号面试为0,无法生成卡号"
                })
            }
        }else{
            response.endJson({
                err:1,
                msg:"卡号面试为0,无法生成卡号"
            })
        }
    },
    userLoginByA:function(postString,header,response){
        var userId = _util.getQueryString(postString,"UserId")||"";
        var pwd = _util.getQueryString(postString,"Password")||"";
        var beReplaceUserNo = _util.getQueryString(postString,"BeReplaceUserNo")||"";
        var mac = _util.getQueryString(postString,"MacNo")||"";

        if(pwd&&pwd.length!=32){
            pwd = utility.MD5(pwd);
        }

        if(!userId||!pwd){
            //密码或者帐号没输入
            return response.endJson({
                err:401,
                msg:"密码或者帐号没输入"
            });
        }
        async.waterfall([
            function(cb){
                dal.getData("gUser","UserNo",userId,function(result){
                    if(result){
                        //帐号存在 -> 作各种判断
                        if(result.Password.toUpperCase()!=pwd.toUpperCase()||result.UserType==3){
                            //密码错误
                            return cb(null,-2);
                        }
                        if(result.Auditing.toString()!="true"){
                            //帐号被封
                            return cb(null,-1);
                        }
                        if(result.UserType=="1"&&result.MacNO!=mac){
                            var opt = {
                                collection:"gResetMac",
                                query:{
                                    UserNo:result.UserNo,
                                    Disabled:false
                                }
                            };
                            mongodb.findOne(opt,function(err,_result){
                                if(err) utility.handleException(err);
                                if(_result){
                                    result.ResetMac = true;
                                    cb(null,result);
                                    var _opt={
                                        collection:"gResetMac",
                                        query:{
                                            UserNo:result.UserNo,
                                            Disabled:false
                                        },
                                        newObject:{
                                            $set:{
                                                Disabled:true,
                                                ResetTime:(new Date()).getTime()
                                            }
                                        }
                                    };
                                    mongodb.update(_opt)
                                }else{
                                    cb(null,-1000);
                                }
                            })
                        }else {
                            return cb(null, result);
                        }
                    }else{
                        //帐号错误
                        return cb(null,-3);
                    }
                });
            },
            function(result,cb){
                if(result<=0){
                    cb(null,result.toString());
                }else if(beReplaceUserNo) {
                    dal.getData("gUser", "UserNo", beReplaceUserNo, function (beReplaceUser) {
                        if (!beReplaceUser || (beReplaceUser.Auditing.toString() != "true" || beReplaceUser.UserType != 2)) {
                            return cb(null, -1001);
                        } else {
                            return cb(null, result);
                        }
                    });
                }else{
                    cb(null,result);
                }
            },function(result,cb){
                if(result<=0){
                    cb(null,result.toString());
                }else {
                    var opt = {
                        collection: "gUser",
                        query: {
                            UserType: _util.userType.SubQuestionUser,
                            ParentUserNo: result.UserNo
                        }
                    };
                    mongodb.count(opt, function (err, _result) {
                        result.isShow = (err || _result) ? true : false;
                        cb(null, result);
                    })
                }
            }
        ],function(err,result){
            var obj = {
                err:0,
                msg:"",
                redirectTo:"",
                show:false
            };
            if(result=="-2"){
                obj.err=403;
                obj.msg="密码错误"
            }else if(result=="-1"){
                obj.err=405;
                obj.msg="此帐号不能登录"
            }else if(result=="-3"){
                obj.err=403;
                obj.msg="账号错误"
            }else if(result=="-1000") {
                obj.err = 406;
                obj.msg = "此账号不能在此机登录,Mac绑定错误,请联系管理员联系"
            }else if(result.UserType==_util.userType.Answer){
                //Answer
                obj.redirectTo="#/answer";
                obj.show = (result.isSubAdmin||"false").toString()=="true";
                if( result.ResetMac){
                    obj.ResetMac = result.MacNO;
                }
            }else if(result.UserType==_util.userType.Question){
                //Question
                obj.show = result.isShow;
                if( result.isShow){
                    obj.redirectTo="#/subQuestionUser";
                }else{
                    obj.redirectTo="#/chargeRecord";
                }

            }else if(result.UserType==_util.userType.SubQuestionUser){
                //subQuestion
                obj.redirectTo="#/chargeRecord"
                //子账号
            }else if(result.UserType==_util.userType.Admin){
                obj.redirectTo="#/admin"
            }
            if(result.UserType>0){
                header.setSession("authorization",true)
                header.setSession("User",result)
            }
            response.endJson(obj);
        });
    },
    getRegistStatisticsInfo:function(postString,header,response){
        async.parallel({
            type_1:function(cb){
                var opt={
                    collection:"gUser",
                    query:{
                        UserType:1
                    }
                };
                mongodb.count(opt,function(err,result_forType_1){
                    cb(err,result_forType_1);
                })
            },
            type_2:function(cb){
                var opt={
                    collection:"gUser",
                    query:{
                        UserType:2
                    }
                };
                mongodb.count(opt,function(err,result_forType_2){
                    cb(err,result_forType_2);
                })
            },
            type_3:function(cb){
                var opt={
                    collection:"gUser",
                    query:{
                        UserType:3
                    }
                };
                mongodb.count(opt,function(err,result_forType_3){
                    cb(err,result_forType_3);
                })
            },
            type_4:function(cb){
                var opt={
                    collection:"gUser",
                    query:{
                        UserType:4
                    }
                };
                mongodb.count(opt,function(err,result_forType_4){
                    cb(err,result_forType_4);
                })
            }
        },function(err,result){
            if(err){
                utility.handleException(err);
            }
            return response.endJson(result)
        })
    },
    getMd5ImageState:function(postString,header,response){
        async.parallel({
            Size:function(cb){
                var opt={
                    collection:"gImageMd5Rec"
                };
                mongodb.count(opt,function(err,result){
                    cb(err,result);
                })
            },
            OtherInfo:function(cb){
                var today =_util.today().toString();
                var opt={
                    collection:"gUserTotal",
                    query:{
                        UserNo:"system",
                        QuestionDate:today
                    }
                };
                mongodb.findOne(opt,function(err,result){
                    cb(err,result);
                })
            }
        },function(err,result){
            if(err){
                utility.handleException(err);
                return response.endJson({
                    err:500,
                    msg:"服务器内部错误,请查看日志"
                });
            }
            var res = {
                size:result.Size,
                answerCount:result.OtherInfo.QuestionCount||0,
                answerCredit:result.OtherInfo.QuestionCredits||0,
                timeOutCount:result.OtherInfo.TimeOutCount||0,
                errorCount:result.OtherInfo.ReportErrorCount||0
            };
            return response.endJson(res);
        });
    },
    getImageCollectionState:function(postString,header,response){
        async.parallel({
            files:function(cb){
                mongodb.mongo(function(err,client,release,genId){
                    var collection = "fs.files";
                    if(!utility.isNull(client)){
                        client.collection(collection,function(err,col){
                            if(err){
                                release();
                                utility.handleException(err);
                                return cb(err);
                            }
                            col.stats(function(err,data){
                                release();
                                cb(err,data);
                            });
                        });
                    }
                })
            },
            chunks:function(cb){
                mongodb.mongo(function(err,client,release,genId){
                    var collection = "fs.chunks";
                    if(!utility.isNull(client)){
                        client.collection(collection,function(err,col){
                            if(err){
                                release();
                                utility.handleException(err);
                                return cb(err);
                            }
                            col.stats(function(err,data){
                                release();
                                cb(err,data);
                            });
                        });
                    }
                })
            }
        },function(err,result){
            if(err){
                return response.endJson({
                    err:500,
                    msg:"服务器内部错误,请查看日志"
                })
            }
            response.endJson({
                size:result.files.count||0,
                capacity:((result.chunks.storageSize||0)/Math.pow(1024,3)).toFixed(4)+"Gb",
                index:{
                    files:result.files.indexSizes,
                    chunks:result.chunks.indexSizes
                }
            });
        });
    },
    getRunState:function(postString,header,response){
        async.parallel({
            count:function(cb){
                var nadirTime =  _util.today();
                var peakTime =  _util.today()+24*3600*1000;
                var opt={
                    collection:"gQuestion",
                    query:{
                        QuestionDate:{
                            $gt:nadirTime,
                            $lt:peakTime
                        }
                    }
                };
                mongodb.count(opt,cb);
            },
            list:function(cb){
                dal.getWaitingQuestionListLength(function(result){
                    cb(null,result);
                })
            },
            answering:function(cb){
                cb(null,0)
            },
            timeOutCount:function(cb){
                var nadirTime =  _util.today();
                var peakTime =  _util.today()+24*3600*1000;
                var opt={
                    collection:"gQuestion",
                    query:{
                        QuestionDate:{
                            $gt:nadirTime,
                            $lt:peakTime
                        },
                        Status:_util.Status.TimeOut
                    }
                };
                mongodb.count(opt,cb);
            },
            errorCount:function(cb){
                var nadirTime =  _util.today();
                var peakTime =  _util.today()+24*3600*1000;
                var opt={
                    collection:"gQuestion",
                    query:{
                        QuestionDate:{
                            $gt:nadirTime,
                            $lt:peakTime
                        },
                        Status:_util.Status.Error
                    }
                };
                mongodb.count(opt,cb);
            },
            otherError:function(cb){
                var nadirTime =  _util.today();
                var peakTime =  _util.today()+24*3600*1000;
                var opt={
                    collection:"gQuestion",
                    query:{
                        QuestionDate:{
                            $gt:nadirTime,
                            $lt:peakTime
                        },
                        Status:_util.Status.Unknown
                    }
                };
                mongodb.count(opt,cb);
            },
            mamoryUsage:function(cb){
                var state = process.memoryUsage();
                var obj = (state.heapUsed/1024).toFixed(2)+"Kb/"+(state.heapTotal/1024).toFixed(2)+"Kb";
                cb(null,obj);
            }
        },function(err,result){
            if(err){
                utility.debug(err);
                return response.endJson({
                    err:500,
                    msg:"服务器内部错误,请查看日志"
                })
            }
            response.endJson(result);
        });
    },
    userIdCheckExists:function(postString,header,response){
        var userNo = _util.getQueryString(postString,"userNo");
        var opt = {
            collection:"gUser",
            query:{
                UserNo:userNo||"_"
            }
        };
        mongodb.count(opt,function(err,result){
            if(err||result){
                return response.endJson({
                    err:1,
                    msg:"UserNo已存在"
                })
            }
            return response.endJson({
                err:0
            })
        })
    },
    userRegister:function(postString,header,response){
        var userNo = _util.getQueryString(postString,"userNo"),
            pwd = _util.getQueryString(postString,"userPwd"),
            QQNo = _util.getQueryString(postString,"userQQNo"),
            macNo = _util.getQueryString(postString,"macNo"),
            userType = parseInt(_util.getQueryString(postString,"userType")||"1");
        var userItem = _util.createUser();
        userItem.UserNo = userNo;
        userItem.Password = utility.MD5(pwd);
        userItem.UserQQ = QQNo;
        userItem.MacNO = macNo;
        userItem.UserType = userType;
        async.waterfall([function(cb){
            var opt = {
                collection:"gUser",
                query:{
                    UserNo:userNo||"_"
                }
            }
            mongodb.count(opt,function(err,result){
                if(err||result){
                    cb({
                        err:1,
                        msg:"帐号"+userNo+"已存在"
                    });
                }else{
                    cb(null,{
                        err:0
                    });
                }
            })
        },function(result,cb){
            //帐号不存在
            var opt = {
                collection:"gUser",
                newObject:userItem
            };
            mongodb.insert(opt,function(err,result){
                if(err){
                    cb({
                        err:500,
                        msg:"服务器内部错误,请联系管理员"
                    })
                }else{
                    cb(null,{
                        err:0,
                        msg:"注册成功"
                    })
                }
            })
        }],function(err,result){
            response.endJson(err||result)
        });
    },
    getQuestionTypeList:function(postString,header,response){
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
        pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);

        var opt={
            collection:"gGameItem",
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[["gItemNo","ascending"]]
        };

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
//            var arr = result.list.ConvertAll(function(item){
//                item.UserItemList = [];
//                return item.gItemNo;
//            })
//            var opt = {
//                collection:"gUserItem",
//                query:{
//                    $in:arr
//                }
//            };
//            var list = result.list;
//            var size = result.size;
//            mongodb.query(opt,function(_err,_result){
//                _result.forEach(function(userItem){
//                    var temp = userItem.gItemNo;
//                    var target = list.Find(function(gItem){return gItem.gItemNo==temp;});
//                    if(target) target.UserItemList.push(userItem);
//                })
                response.endJson({
                    result:result.list,
                    size:result.size
                })
//            })
        });
    },
    removeQuestionType:function(postString,header,response){
        var no = parseInt(_util.getQueryString(postString,"gItemNo")||-1);
        var opt = {
            collection:"gGameItem",
            query:{
                gItemNo:no
            }
        };
        mongodb.remove(opt,function(err,result){
            if(result){
                response.endJson({
                    err:0
                })
            }else {
                response.endJson({
                    err: 1,
                    msg: "删除出错,请查看日志"
                })
            }
        })
    },
    updateQuestionType:function(postString,header,response){
        var obj = header.get("model");
        var isAddNew = header.get("isAdd");
        if(isAddNew){
            var gameItem = _util.createGameItem();
            gameItem.gItemNo = parseInt(obj.gItemNo||0);
            gameItem.TakeCredits = parseInt(obj.TakeCredits||0);
            gameItem.Remark = obj.Remark;
            gameItem.TakeCredits1 = parseInt(obj.TakeCredits1||0);
            gameItem.TakeCredits2 = parseInt(obj.TakeCredits2||0);
            gameItem.TakeCredits3 = parseInt(obj.TakeCredits3||0);
            gameItem.AnswerCredits1 = parseInt(obj.AnswerCredits1||0);
            gameItem.AnswerCredits2 = parseInt(obj.AnswerCredits2||0);
            gameItem.AnswerCredits3 = parseInt(obj.AnswerCredits3||0);
            gameItem.gItemName = obj.gItemName;
            gameItem.gItemType = obj.gItemType;
            gameItem.TimeOut = parseInt(obj.TimeOut||20);
            gameItem.gAnswerLen = parseInt(obj.gAnswerLen||0);
            gameItem.UserNo = obj.UserNo||"system";
            gameItem.AnswerIn = obj.AnswerIn;
            gameItem.AnswerNotIn = obj.AnswerNotIn;
            gameItem.CheckStr = obj.CheckStr;
            gameItem.RegExp =obj.RegExp;
            gameItem.Script = obj.Script;
            gameItem.UserItemList = obj.UserItemList||[];

            if(!gameItem.gItemNo){
                return response.endJson({
                    err:1,
                    msg:"数据异常,添加失败"
                })
            }
            var opt = {
                collection:"gGameItem",
                newObject:gameItem
            };
            mongodb.insert(opt,function(err,result){
                if(err){
                    return response.endJson({
                        err:1,
                        msg:"添加数据出错,请查看日志"
                    })
                }
                return response.endJson({
                    err:0
                })

            });
        }else{
            dal.getData("gGameItem","gItemNo",obj.gItemNo,function(){
                var newObject ={
                    UserNo:obj.UserNo,
                    TakeCredits1:parseInt(obj.TakeCredits1||10),
                    AnswerCredits1:parseInt(obj.AnswerCredits1||0),
                    gItemType:obj.gItemType,
                    gItemName:obj.gItemName,
                    TimeOut:parseInt(obj.TimeOut||30),
                    RegExp:obj.RegExp,
                    Script:obj.Script,
                    Remark:obj.Remark,
                    UserItemList:obj.UserItemList
                };
                dal.setData("gGameItem","gItemNo",obj.gItemNo,newObject,function(result){
                    response.endJson({
                        err:0
                    })
                })
            });
        }
    },
    getUserList:function(postString,header,response) {
        var userType = _util.getQueryString(postString,"userType")||"",
            userName = _util.getQueryString(postString,"userName")||"",
            userAudit = _util.getQueryString(postString,"userAudit")||"",
            pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);
        var opt={
            collection:"gUser",
            query:{},
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[
                ["RegTime","ascending"]
            ]
        };
        if(userType) opt.query.UserType = parseInt(userType);
        if(userName) opt.query.UserNo = new RegExp(userName,"g");
        if(userAudit) opt.query.Auditing = userAudit=="true";
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
            response.endJson({
                err:0,
                result:result.list,
                size:result.size
            })
        });
    },
    disabledUser:function(postString,header,response){
        var userNo = _util.getQueryString(postString,"userNo")||"_";
        var status = _util.getQueryString(postString,"status")||"false";
        var opt = {
            collection:"gUser",
            query:{
                UserNo:userNo
            },
            newObject:{
               $set: {
                   Auditing: status == "true"
               }
            }
        };
        mongodb.update(opt,function(err,result){
            var opt = {
                err:0
            }
            if(!result){
                opt.err=1;
            }
            response.endJson(opt);
        });
        redis.del("gUser_"+userNo);
        //todo:add track audit
    },
    resetMac:function(postString,header,response){
        var currentUserNo = header.getSession("User").UserNo;
        var userNo = _util.getQueryString(postString,"userNo")||"_";
        var userMac = _util.getQueryString(postString,"userMac")||"_";
        var opt={
            collection:"gResetMac",
            query:{
                UserNo:userNo,
                Disabled:false
            },
            newObject:{
                $set:{
                    UserNo:userNo,
                    ResetTime:0,
                    Disabled:false,
                    AddTime:(new Date().getTime()),
                    ResetUser:currentUserNo
                }
            }
        };
        mongodb.upsert(opt,function(err,result){
            if(err) {
                utility.handleException(err);
                return response.endJson({
                    err:1,
                    msg:"重置错误,请联系管理员"
                })
            }
            if(result){
                return response.endJson({
                    err:0,
                    msg:"重置成功"
                })
            }
        })
        //todo: Add audit track
    },
    getProblemQuestion:function(postString,header,response){
        var dateTime = _util.getQueryString(postString,"")||0;
        var answerId = _util.getQueryString(postString,"answerId");
        var questionerId = _util.getQueryString(postString,"questionerId");
        var status = _util.getQueryString(postString,"status"),
        pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
        pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);

        var opt={
            collection:"gQuestionBackUp",
            query:{},
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[
                ["QuestionDate","descending"]
            ]
        };

        if(dateTime){
            dateTime = parseInt(dateTime)-24*3600*1000;
            opt.query.QuestionDate = {
                $gt:dateTime
            };
        }
        if(answerId){
            opt.query.AnswererId = new RegExp(answerId,"g");
        }
        if(questionerId){
            opt.query.QuesterId = new RegExp(questionerId,"g");
        }
        if(status){
            opt.query.Status = parseInt(status);
        }

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
            response.endJson({
                err:0,
                result:result.list,
                size:result.size
            })
        });
    },
    updateUserInfo:function(postString,header,response){
        var userObj = header.get("user");
        var userNo = userObj.UserNo;
        var newObj = {
            Remark:userObj.Remark||"",
            UserQQ:userObj.UserQQ||"",
            UserName:userObj.UserName||"",
            isSubAdmin:(userObj.isSubAdmin||"false").toString()=="true",
            gItemTypeIn:userObj.gItemTypeIn||""
        }
        dal.setData("gUser","UserNo",userNo,newObj,function(result){
            if(result){
               return response.endJson({
                    err:0
                })
            }
            return response.endJson({
                err:1,
                msg:"更新用户数据出错,请查看日志"
            })
        });
    },
    getRebateList:function(postString,header,response){
        var gItemNo = _util.getQueryString(postString,"gItemNo"),
            dateTimeFrom = parseInt(_util.getQueryString(postString,"dateTimeFrom")||0),
            dateTimeTo = parseInt(_util.getQueryString(postString,"dateTimeTo")||0),
            pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);

        var opt={
            collection:"gRebate",
            query:{},
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[
                ["QuestionDate","descending"]
            ]
        };
        if(gItemNo){
            opt.query.gItemNo = gItemNo;
        }
        if(dateTimeFrom>0){
            opt.query.QuestionDate ={
                $gt:dateTimeFrom
            };
        }
        if(dateTimeTo>0){
            if(opt.query.QuestionDate){
                opt.query.QuestionDate["$lt"]=dateTimeTo;
            }else{
                opt.query.QuestionDate ={
                    $lt:dateTimeTo
                };
            }
        }
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
            response.endJson({
                err:0,
                result:result.list,
                size:result.size
            })
        });
    },
    reCharge:function(postString,header,response){
        var userNo = _util.getQueryString(postString,"userNo")||"_";
        var cardNo = _util.getQueryString(postString,"cardNo")||"_";
        async.parallel({
            user:function(cb){
                dal.getData("gUser","UserNo",userNo,function(user){
                    if(!user){
                        cb(true)
                    }else{
                        cb(null,user);
                    }
                })
            },
            card:function(cb){
                var opt ={
                    collection:"gCard",
                    query:{
                        CardNo:cardNo,
                        Auditing : false
                    }
                };
                mongodb.findOne(opt,function(err,card){
                    if(err||!card){
                        cb(true)
                    }else{
                        cb(null,card);
                    }
                })
            }
        },function(err,result){
           if(err){
               return response.endJson({
                   err:1,
                   msg:"充值失败"
               })
           }else{
               async.parallel({
                   user:function(cb){
                        var newObj={
                            QuestionCredits:parseInt(result.user.QuestionCredits||"0")+ parseInt(result.card.CardPrice)*1000
                        };
                       dal.setData("gUser","UserNo",userNo,newObj,function(_result){
                           if(_result){
                               cb(null,null);
                           }else{
                               cb(true);
                           }
                       })
                   },
                   card:function(cb){
                       var opt={
                           collection:"gCard",
                           query:{
                               CardNo:result.card.CardNo,
                               Auditing:false
                           },
                           newObject:{
                               $set:{
                                   Auditing: true,
                                   CardTime: (new Date()).getTime(),
                                   CardUser: result.user.UserNo,
                                   UserType: parseInt(result.user.UserType)
                               }
                           }
                       };
                       mongodb.update(opt,function(err,result){
                           if(err||!result){
                               cb(true);
                           }else{
                               cb(null,null);
                           }
                       })
                   }
               },function(_err,_result){
                    if(_err){
                        response.endJson({
                            err:1,
                            msg:"充值失败"
                        })
                    }else{
                        response.endJson({
                            err:0
                        })
                    }
               });

           }
        });
    },
    getCardList:function(postString,header,response){
        var Auditing = (_util.getQueryString(postString,"Auditing")||"false")=="true",
            pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1),
            alipay = _util.getQueryString(postString,"Alipay")||"";
        var opt={
            collection:"gCard",
            query:{

            },
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[
                ["Auditing","ascending","AddTime","descending"]
            ]
        };
        if(Auditing){
            opt.query.Auditing = Auditing;
        }
        if(alipay){
            opt.query.Alipay = new RegExp(alipay,"g");
        }
        dal.loadPage(opt,function(result){
            response.endJson(result);
        });


    },
    removeCard:function(postString,header,response){
        var cardId = _util.getQueryString(postString,"CardId")||"";
        var opt={
            collection:"gCard",
            query:{
                _id:cardId
            }
        };
        mongodb.remove(opt,function(err,result){
            if(result){
                response.endJson({
                    err:0
                })
            }else{
                response.endJson({
                    err:1
                })
            }
        })
    },
    getDepositStatus:function(postString,header,response){
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
        pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);
        var opt={
            collection:"gDeposit",
            query:{
            },
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[
                ["IsFinish","ascending","CreateTime","descending"]
            ]
        };
        dal.loadPage(opt,function(result){
            response.endJson(result)
        })
    },
    deposit:function(postString,header,response){
        var userId = _util.getQueryString(postString,"userNo"),
            creditNo = _util.getQueryString(postString,"creditNo"),
            userNo = header.getSession("User").UserNo;
        var opt={
            collection:"gDeposit",
            query:{
                UserNo:userId,
                CreditNo:creditNo
            },
            newObject:{
                $set:{
                    IsFinish:true,
                    AuditUserNo:userNo
                }
            }
        };
        mongodb.update(opt,function(err,result){
            if(err||!result){
                if(err) utility.handleException(err);
                response.endJson({
                    err:1,
                    msg:"服务器内部错误,请查看日志"
                })
            }else{
                response.endJson({
                    err:0
                })
            }
        })
    },
    updateUserItem:function(postString,header,response){

    }
};

module.exports.admin=main;