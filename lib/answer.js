/**
 * Created by Huang on 2014/6/11.
 */

var dal = require("./dataAdapter.js"),
    async = require("async"),
    fs = require("fs"),
    mongo  = require("../lib/mongoClient.js"),
    redis = require("./redis.js"),
    Grid = require("mongodb").Grid,
    path = require("path"),
    _util = require("./comLib.js").util;



var _handler={
    userLoginByA:function(postString,header,response){
        var userId = _util.getQueryString(postString,"UserId")||"";
        var pwd = _util.getQueryString(postString,"Password")||"";
        var beReplaceUserNo = _util.getQueryString(postString,"BeReplaceUserNo")||"";
        var mac = _util.getQueryString(postString,"MacNo")|"";

        if(pwd&&pwd.length!=32){
            pwd = utility.MD5(pwd);
        }

        if(!userId||!pwd){
            return response.end("-1");
        }
        async.waterfall([
            function(cb){
                dal.getData("gUser","UserNo",userId,function(result){
                    if(result){
                        //帐号存在 -> 作各种判断
                        if(result.Auditing.toString()!="true"){
                            return cb(null,-1);
                        }
                        if(mac&&result.MacNo!=mac){
                            return cb(null,-1000);
                        }
                        return cb(null,result.UserType);
                    }else{
                        //帐号错误
                        return cb(null,0);
                    }
                });
            },
            function(result,cb){
                if(!result<=0){
                    cb(null,result.toString());
                }else if(beReplaceUserNo){
                    dal.getData("gUser","UserNo",beReplaceUserNo,function(beReplaceUser){
                        if(!beReplaceUser||(beReplaceUser.Auditing.toString()!="true"||beReplaceUser.UserType!=2)){
                            return cb(null,-1001);
                        }else{
                            return cb(null,result);
                        }
                    });
                }else{
                    cb(null,result);
                }
            }
        ],function(err,result){
            response.end(result.toString());
        });
    },
    getQuestion:function(postString,header,response){
        var user = header.getSession("User");
        var userNo = user.UserNo||"";
        var gItemTypeIn = (user.gItemTypeIn||"").split(",")||[];
        async.waterfall([
            function(cb){
                dal.popNeedToAnswerQuestion(gItemTypeIn,function(gQuestionNo){
                    if(gQuestionNo){
                        cb(null,gQuestionNo);
                    }else {
                        cb(true,null);
                    }
                });
            },
            function(gQuestionNo,cb){
                dal.getData("gQuestion","QuestionNO",gQuestionNo,function(result){
                    if(result){
                        if(result.Status!=_util.Status.Waiting){
                            cb(true,null);
                        }else{
                            cb(null,result);
                            //设为正在回答状态
                            var obj={
                                Status:_util.Status.Answering,
                                AnswererId:userNo,
                                AnswerDate:(new Date()).getTime()
                            };
                            dal.setData("gQuestion","QuestionNO",gQuestionNo,obj);
                            dal.setBackUpQuestion(obj,gQuestionNo);
                        }
                    }else{
                       cb(true,null);
                    }
                });
            },
            function(question,cb){
                mongo.mongo(function(err,db,release,genid){
                    var grid = new Grid(db,"fs");
                    grid.get(genid(question.imgId),function(err,data){
                        release();
                        question.imgData = data;
                        cb(null,question);
                    })
                })
            }
        ],function(err,result){
            if(err){
                response.endJson({
                    error: 100,
                    msg: "No Question"
                });
            }else {
                var _result = {};
                _result.QuestionNO =  result.QuestionNO;
                //_result.imgUrl = "./file/getimg?imgid=" + result.imgId;
                _result.imgUrl="data:image/jpeg;base64,"+result.imgData.toString("base64");
                _result.gItemNo =  result.gItemNo;
                _result.Remark = result.Remark;
                _result.QuestionDate = parseInt(result.QuestionDate);
                _result.QuestionDateSpan =  ((new Date().getTime() -  _result.QuestionDate)/1000).toFixed(2)+"秒前";
                _result.TimeOut =  result.TimeOut;
                _result.RegExp = result.RegExp;
                _result.Script = result.Script;
                response.endJson({
                    error:0,
                    result:_result
                });
            }
        })

    },
    backQuestion:function(postString,header,response){
        var questionNo = _util.getQueryString(postString,"")||"";
        var UserId = _util.getQueryString(postString,"")||"";
        if(!questionNo||!UserId){
            return response.end("#QuestionNoError");
        }
        async.waterfall([
            function(cb){
                dal.getData("gQuestion","QuestionNO",questionNo,function(result){
                    if(!result){
                        return cb(null,"#QuestionNoError");
                    }
                    var nowTime = (new Date()).getTime();
                    var timeOutTime = result.QuestionDate + result.TimeOut*1000;
                    if((timeOutTime-nowTime)>20*1000){//至少要有20秒种才能反题
                        cb(null,true);
                        dal.leftPushToWaitForAnswerList(questionNo);
                    }else{
                        cb(null,false);
                    }
                });
            }
        ],function(err,result){
            result = result||"#QuestionNoError";
            response.end(result.toString());
        });
    },
    postAnswer:function(postString,header,response){
        var QuestionNO = _util.getQueryString(postString,"QuestionNO")||"";
        var answerTxt = _util.getQueryString(postString,"answerTxt")||"";
        var answererId = _util.getQueryString(postString,"answererId")
            ||header.getSession("User").UserNo;
        async.waterfall([
            function(cb){
                //计算题目是否超时
                dal.getData("gQuestion","QuestionNO",QuestionNO,function(question){
                    var currentTime = new Date().getTime();
                    if(!question) return cb(true);
                    var questionTime =parseInt(question.QuestionDate)+parseInt(question.TimeOut)*1000;
                    var isTimeOut = false;//假设题目没有超时
                    if(currentTime>questionTime&&question.Status!=_util.Status.TimeOut){
                        //题目已经超时
                        isTimeOut = true;
                        cb(null,question,isTimeOut);
                        //todo comment out
                        //console.log("由answer端来设定超时");
                    }else if(question.Status==_util.Status.TimeOut){
                        //todo comment out
                        //console.log("question端已经设定超时");
                        cb(true);
                    }else{
                        //todo comment out
                        //console.log("没有超时,正常回答");
                        cb(null,question,isTimeOut);
                    }

                });
            },
            function(question,isTimeOut,cb){
                var qUser = question.QuesterId||"";
                var aUser = answererId||"";
                var qCredit = parseInt(question.TakeCredits)||0;
                var aCredit = parseInt(question.AnswerCredits)||0;
                var rebateUserNo = question.RebateUserNo||"";
                var md5Str = question.ImageMd5_32||"";
                var gItemNo = question.gItemNo||"";
                var today =_util.today().toString();
                var newObj = {
                    Status: _util.Status.Answered,//0:待答 1:已回答 2:正在回答 -1:未知Unknown  -4:超时
                    AnswererId : answererId,
                    AnswerDate : new Date().getTime(),
                    sAnswer:answerTxt
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
                            TimeOutCount:0
                        },
                        $set:{
                            Credit: parseInt(question.TakeCredits)||0,
                            Discount:parseFloat(question.Discount)||0
                        }
                    }
                };
                if(isTimeOut){
                    //超时处理 1.将答案保存在md5库里面 2.写redis 和 mongodb
                    newObj.sAnswer ="#TimeOut";
                    newObj.Status = _util.Status.TimeOut;
                    opt.newObject["$inc"].TimeOutCount=1;
                    newObj.TakeCredits = 0;
                    qCredit=0;
                    aCredit=0;
                }
                if(answerTxt.toUpperCase()=="#UNKNOWN"){
                    newObj.sAnswer ="#Unknown";
                    newObj.Status = _util.Status.Unknown;
                    newObj.TakeCredits = 0;
                    qCredit=0;
                    aCredit=0;
                }
                dal.setData("gQuestion","QuestionNO",QuestionNO,newObj);
                dal.setBackUpQuestion(newObj,QuestionNO);

                if(qCredit){
                    dal.getData("gUser","UserNo",qUser,function(user){
                        if(user){
                            dal.gUserCreditUpdate(user.UserNo,"QuestionCredits",-qCredit);
                        }
                    });//gUser表 问题者
                }

                if(aCredit){
                    dal.getData("gUser","UserNo",aUser,function(user){
                        if(user){
                            dal.gUserCreditUpdate(user.UserNo,"AnswerCredits",aCredit);
                        }
                    });//gUser表 答题者
                }


                dal.gUserTotalSetCredits(qUser,question.QuestionDate,qCredit,newObj.Status);//gUserTotal表 问题者积分
                dal.gUserTotalSetCredits(aUser,question.QuestionDate,aCredit,newObj.Status);//gUserTotal表 回答者积分
                if(question.UserType==_util.userType.SubQuestionUser){
                    //子账户提交的问题才有返利
                    mongo.upsert(opt)
                }


                if(newObj.Status==_util.Status.Answered){
                    var md5 = _util.createImageMd5();
                    md5.sAnswer = answerTxt;
                    md5.ImageMd5 = md5Str;
                    dal.setData("gImageMd5Rec","ImageMd5",md5Str,md5);
                }
                cb(null);
            }
        ],function(err){
            response.endJson({
                err:0
            });
        });
    },
    getRecentAnswerRecords:function(postString,header,response){
        var UserNo = header.getSession("User").UserNo||"_";
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);
        var opt={
            collection:"gQuestion",
            query:{
                AnswererId:UserNo
            },
            sort:[["QuestionDate","descending"]],
            pageIndex:pageIndex,
            pageSize:pageSize
        };
        dal.loadPage(opt,function(result){
            response.endJson(result)
        })
    },
    getRecentCreditRecords:function(postString,header,response) {
        var UserNo = header.getSession("User").UserNo||"_";
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);

        var opt={
            collection:"gUserTotal",
            query:{
                UserNo:UserNo
            },
            sort:[["QuestionDate","descending"]],
            pageIndex:pageIndex,
            pageSize:pageSize
        };
        dal.loadPage(opt,function(result){
            response.endJson(result)
        })
    },
    getTodayAnswerRecords:function(postString,header,response){
        var UserNo = header.getSession("User").UserNo||"_";
        var today = _util.today().toString();
        var arr=[today,UserNo];
        dal.getData("gUserTotal",["QuestionDate","UserNo"],arr,function(result){
            response.endJson({
                result:result
            })
        })
    },
    getAnswerProfiles:function(postString,header,response){
        var UserNo = header.getSession("User").UserNo||"_";
        dal.getData("gUser","UserNo",UserNo,function(result){
            var user = {};
            user.UserNo=result.UserNo;
            user.UserName=result.UserName;
            user.UserEmail=result.UserEmail;
            user.AnswerCredits=result.AnswerCredits;
            user.UserQQ=result.UserQQ;
            user.RegTime=parseInt(result.RegTime);
            response.endJson({
                result:user
            })
        })
    },
    updateAnswerProfiles:function(postString,header,response){
        var c_user = header.getSession("User")||{};
        var UserName = _util.getQueryString(postString,"UserName")||"";
        var UserQQ = _util.getQueryString(postString,"UserQQ")||"";
        var UserEmail = _util.getQueryString(postString,"UserEmail")||"";
        var UserPrePwd = _util.getQueryString(postString,"prePwd")||"";
        var UserUpdPwd = _util.getQueryString(postString,"updPwd1")||"";
        if(UserPrePwd){
            var pwd = utility.MD5(UserPrePwd);
            if(c_user.Password!=pwd){
                return response.endJson({
                    err:401,
                    msg:"提供的原密码错误"
                })
            }
            var newPwd = utility.MD5(UserUpdPwd);
            dal.setData("gUser","UserNo",c_user.UserNo,{Password:newPwd},function(result){
                var _opt = {
                    err:0,
                    msg:"密码修改成功"
                };
                if(!result){
                    _opt.err=1;
                    _opt.msg="未能修改密码,请联系管理员"
                }
                return response.endJson(_opt);
            });
        }else{
            var newObject = {};
            if(UserName){
                newObject.UserName = UserName;
            }
            if(UserQQ){
                newObject.UserQQ = UserQQ;
            }
            if(UserEmail){
                newObject.UserEmail = UserEmail;
            }
            dal.setData("gUser","UserNo",c_user.UserNo,newObject,function(result){
                var _opt={
                    err:0,
                    msg:"修改成功"
                };
                if(!result){
                    _opt.err=500;
                    _opt.msg="修改失败,请联系管理员";
                }
                response.endJson(_opt);
            })
        }
    },
    getSubUserList:function(postString,header,response){
        var user = header.getSession("User")||{};
        if((user.isSubAdmin||"false").toString()=="true"){
            var userName = _util.getQueryString(postString,"userName")||"",
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
            opt.query.UserType = 1;
            if(userName) opt.query.UserNo = new RegExp(userName,"g");
            if(userAudit) opt.query.Auditing = userAudit=="true";
            async.parallel({
                size:function(cb){
                    mongo.count(opt,function(err,len){
                        if(err) utility.handleException(err);
                        cb(null,len||0);
                    })
                },
                list:function(cb){
                    mongo.query(opt,function(err,result){
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
        }else{
            return response.endJson({
                err:403,
                msg:"无权限访问"
            })
        }
    },
    disabledSubUser:function(postString,header,response){
        var userNo = _util.getQueryString(postString,"userNo")||"_";
        var status = _util.getQueryString(postString,"status")||"false";
        var opt = {
            collection:"gUser",
            query:{
                UserNo:userNo,
                UserType:1
            },
            newObject:{
                $set: {
                    Auditing: status == "true"
                }
            }
        };
        mongo.update(opt,function(err,result){
            var opt = {
                err:0
            }
            if(!result){
                opt.err=1;
            }else{
                redis.del("gUser_"+userNo);
            }
            response.endJson(opt);
        });

        //todo:add track audit
    },
    resetSubMac:function(postString,header,response){
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
        mongo.upsert(opt,function(err,result){
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
    getSubProblemQuestion:function(postString,header,response){
        var dateTime = _util.getQueryString(postString,"")||(new Date()).getTime();
        var answerId = _util.getQueryString(postString,"answerId");
        var questionerId = _util.getQueryString(postString,"questionerId");
        var status = _util.getQueryString(postString,"status"),
            pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);

        var opt={
            collection:"gQuestionP",
            query:{},
            pageSize:pageSize,
            pageIndex:pageIndex
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
                mongo.count(opt,function(err,len){
                    if(err) utility.handleException(err);
                    cb(null,len||0);
                })
            },
            list:function(cb){
                mongo.query(opt,function(err,result){
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
    updateSubUserInfo:function(postString,header,response){
        var userObj = header.get("user");
        var userNo = userObj.UserNo;
        var newObj = {
            Remark:userObj.Remark||"",
            UserQQ:userObj.UserQQ||"",
            UserName:userObj.UserName||"",
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
    deposit:function(postString,header,response){
        var userId = header.getSession("User").UserNo||"";
        var creditNo = _util.getQueryString(postString,"creditNo")||"";
        var cash = parseFloat(_util.getQueryString(postString,"cash")||"0");
        var remark = _util.getQueryString(postString,"remark")||"";
        var least = 20*1000;
        if(userId&&creditNo&&cash){
            if(cash<1) return response.endJson({
                err:1,
                msg:"每次提现需要大于1元钱"
            })
            async.parallel({
                user:function(cb){
                    dal.getData("gUser","UserNo",userId,function(user){
                        var questionCredit = parseInt(user.AnswerCredits||"0");
                        if((questionCredit-cash*1000)<least){
                            cb(1)
                        }else{
                            cb(null,questionCredit);
                        }
                    });
                },
                deposit:function(cb){
                    var opt={
                        collection:"gDeposit",
                        query:{
                            UserNo:userId,
                            Today:_util.today().toString()
                        }
                    }
                    mongo.count(opt,function(err,count){
                        if(err||(count>=2)){
                            cb(2)
                        }else{
                            cb();
                        }
                    })
                },
                credit:function(cb){
                    var opt={
                        collection:"gDeposit",
                        query:{
                            UserNo:userId,
                            CreditNo:creditNo
                        }
                    }
                    mongo.count(opt,function(err,result){
                        if(err||result){
                            cb(3)
                        }else{
                            cb();
                        }
                    })
                }
            },function(err,reuslt){
                if(err){
                    var msg = "你的积分至少保留20000分,不能提现";
                    if(err==2) msg="你今天的提现次数已使用完(一天最多提现两次)";
                    if(err==3) msg="此提现号重复,确认后联系管理员";
                    return response.endJson({
                        err:1,
                        msg:msg
                    })
                }
                async.waterfall([
                    function(cb){
                       dal.gUserCreditUpdate(userId,"AnswerCredits",-(cash*1000),function(result){
                           cb(null,result)
                       })
                    },function(lastResult,cb){
                        var depositRecord = _util.createDepositRecord();
                        depositRecord.UserNo = userId;
                        depositRecord.CreditNo = creditNo;
                        depositRecord.Cash = cash;
                        depositRecord.Remark = remark;
                        var opt={
                            collection:"gDeposit",
                            newObject:depositRecord
                        }
                        dal.gUserCreditUpdate(userId,"HistoryCredits",(cash*1000));
                        mongo.insert(opt,function(err,result){
                            cb(err,result);
                        });
                    }
                ],function(err,_result){
                    if(err) {
                        response.endJson({
                            err:1,
                            msg:"服务器内部错误,请联系管理员"
                        })
                    }else{
                        response.endJson({
                            err:0,
                            msg:"申请提现成功"
                        })
                    }
                });
            });

        }else{
            response.endJson({
                err:1,
                msg:"提现失败,请稍后再试"
            })
        }
    },
    getDepositStatus:function(postString,header,response){
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);
        var userNo = header.getSession("User").UserNo||"_";
        async.parallel({
            user:function(cb){
                dal.getData("gUser","UserNo",userNo,function(user){
                    if(!user) return cb(err);
                    cb(null,user.AnswerCredits);
                })
            },
            deposit:function(cb){
                var opt={
                    collection:"gDeposit",
                    query:{
                        UserNo:userNo
                    },
                    pageSize:pageSize,
                    pageIndex:pageIndex,
                    sort:[
                        ["CreateTime","descending"]
                    ]
                };
                dal.loadPage(opt,function(result){
                    cb(null,result);
                })
            }
        },function(err,result){
            if(err){
                response.endJson({
                    err:1,
                    msg:"服务器内部错误,请联系管理员"
                })
            }else{
                result.deposit.credits = result.user;
                response.endJson(
                    result.deposit
                )
            }
        });
    }
};

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
    if(header.getSession("User").UserType!=1){
        return response.endJson({
            err:403,
            msg:"无权限访问此页面",
            redirectTo:"#/login"
        })
    }
    if(postString.indexOf("UserLoginByA;")>=0){
        _handler.userLoginByA(postString,header,response);
    }else if(postString.indexOf("GetQuestion;")>=0){
        _handler.getQuestion(postString,header,response);
    }else if(postString.indexOf("BackQuestion;")>=0){
        _handler.backQuestion(postString,header,response);
    }else if (postString.indexOf("PostAnswer;")>=0){
        _handler.postAnswer(postString,header,response);
    }else if (postString.indexOf("OnlineCheck;")>=0){
        //doOnlineCheck2DB(postString,header,response);
    }else if (postString.indexOf("GetRecentAnswerRecords;")>=0){
        _handler.getRecentAnswerRecords(postString,header,response);
    }else if (postString.indexOf("GetRecentCreditRecords;")>=0){
        _handler.getRecentCreditRecords(postString,header,response);
    }else if (postString.indexOf("GetTodayAnswerRecords;")>=0){
        _handler.getTodayAnswerRecords(postString,header,response);
    }else if(postString.indexOf("GetAnswerProfiles")>=0){
        _handler.getAnswerProfiles(postString,header,response);
    }else if(postString.indexOf("UpdateAnswerProfiles")>=0){
        _handler.updateAnswerProfiles(postString,header,response);
    }else if(postString.indexOf("getSubUserList")>=0){
        _handler.getSubUserList(postString,header,response);
    }else if(postString.indexOf("disabledSubUser")>=0){
        _handler.disabledSubUser(postString,header,response);
    }else if(postString.indexOf("resetSubMac")>=0){
        _handler.resetSubMac(postString,header,response);
    }else if(postString.indexOf("getSubProblemQuestion")>=0){
        _handler.getSubProblemQuestion(postString,header,response);
    }else if(postString.indexOf("updateSubUserInfo")>=0){
        _handler.updateSubUserInfo(postString,header,response);
    }else if(postString.indexOf("deposit")>=0){
        _handler.deposit(postString,header,response);
    }else if(postString.indexOf("getDepositStatus")>=0){
        _handler.getDepositStatus(postString,header,response);
    }
    else{
        response.end("Instruction Error");
    }

}

module.exports.answer = main;

