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
    isShow:function(postString,header,response){
        var userId = header.getSession("User").UserNo||"_";
        var opt={
            collection:"gUser",
            query:{
                UserType:"3",
                ParentUserNo:userId
            }
        };
        mongo.count(opt,function(err,result){
            response.endJson({
                err:err||result||1
            })
        })
    },
    getSubUserList:function(postString,header,response){
        var userId = header.getSession("User").UserNo||"_",
            userName = _util.getQueryString(postString,"userName")||"",
            userAudit = _util.getQueryString(postString,"userAudit")||"",
            pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);
        var opt={
            collection:"gUser",
            query:{
                UserType:_util.userType.SubQuestionUser,
                ParentUserNo:userId
            },
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[
                ["RegTime","ascending"]
            ]
        };
        if(userName) opt.query.UserNo = new RegExp(userName,"g");
        if(userAudit) opt.query.Auditing = userAudit=="true";

        dal.loadPage(opt,function(result){
            response.endJson(result);
        })
    },
    disabledSubUser:function(postString,header,response){
        var userNo = _util.getQueryString(postString,"userNo")||"_";
        var status = _util.getQueryString(postString,"status")||"false";
        var obj = {
            Auditing:status=="true"
        };
        dal.setData("gUser","UserNo",userNo,obj,function(result){
            if(result){
                response.endJson({
                    err:0
                })
            }else{
                response.endJson({
                    err:1,
                    msg:"服务器内部错误,请联系管理员"
                })
            }
        });
    },
    getOrderList:function(postString,header,response){
        var userNo = header.getSession("User").UserNo||"_";
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10);
        var pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);
        var isSelf = _util.getQueryString(postString,"isSelf")||"false"=="true";

        var opt = {
            collection:"gCard",
            query:{
                CardUser:userNo
            },
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[
                ["CardTime","descending"]
            ]
        };

        if(!isSelf) {
            opt.query = {
                Alipay: userNo
            };
            opt.sort=[
              ["AddTime","descending"]
            ];
        }

        dal.loadPage(opt,function(result){
            if(!isSelf){
                dal.getData("gUser","UserNo",userNo,function(user){
                    result.Credits =parseInt(user.QuestionCredits||"0");
                    response.endJson(result)
                });
            }else{
                response.endJson(result);
            }
        })
    },
    getRebateList:function(postString,header,response){
        var userNo = header.getSession("User").UserNo||"_";
        var dateTimeFrom = parseInt(_util.getQueryString(postString,"dateTimeFrom")||"0");
        var dateTimeTo = parseInt(_util.getQueryString(postString,"dateTimeTo")||"0");
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10);
        var pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);

        var opt = {
            collection:"gRebate",
            query:{
                gItemTypeOwner:userNo
            },
            pageSize:pageSize,
            pageIndex:pageIndex,
            sort:[
                ["QuestionDate","descending"]
            ]
        };
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
        dal.loadPage(opt,function(result){
            response.endJson(result)
        });

    },
    getQuestionList:function(postString,header,response){
        var userNo = header.getSession("User").UserNo||"_";
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10);
        var pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);

        var opt = {
            collection:"gQuestionBackUp",
            query:{
                $or:[
                    {QuesterId:userNo},
                    {gItemTypeOwner:userNo}
                ]
            },
            sort:[["QuestionDate","descending"]],
            pageSize:pageSize,
            pageIndex:pageIndex
        };
        dal.loadPage(opt,function(result){
            response.endJson(result)
        })
    },
    GetPersonProfiles:function(postString,header,response){
        var UserNo = header.getSession("User").UserNo||"_";
        dal.getData("gUser","UserNo",UserNo,function(result){
            var user = {};
            user.UserNo=result.UserNo;
            user.UserName=result.UserName;
            user.UserEmail=result.UserEmail;
            user.QuestionCredits=result.QuestionCredits;
            user.UserQQ=result.UserQQ;
            user.RegTime=parseInt(result.RegTime);
            response.endJson({
                result:user
            })
        })
    },
    UpdatePersonProfiles:function(postString,header,response){
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
    getHistoryRecord:function(postString,header,response){
        var UserNo = header.getSession("User").UserNo||"_";
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);

        var opt={
            collection:"gUserTotal",
            query:{
                UserNo:UserNo
            },
            sort:[["QuestionDate","ascending"]],
            pageSize:10,
            pageIndex:pageIndex,
            pageSize:pageSize
        };
        dal.loadPage(opt,function(result){
            response.endJson(result)
        })
    },
    reCharge:function(postString,header,response){
        var cardNo = _util.getQueryString(postString,"cardNo")||"_";
        var userId = header.getSession("User").UserNo;
        async.waterfall([
            function(cb){
                    var opt = {
                        collection:"gCard",
                        query:{
                            CardNo:cardNo,
                            Auditing:false
                        }
                    };
                mongo.findOne(opt,cb)
            },function(result,cb){
                if(result){
                    var opt={
                        collection:"gCard",
                        query:{
                            _id:result._id.toString()
                        },
                        newObject:result
                    }
                    opt.newObject.CardTime = (new Date()).getTime();
                    opt.newObject.Auditing = true;
                    opt.newObject.UserType = _util.userType.Question;
                    opt.newObject.CardUser = userId;
                    mongo.update(opt)

                    dal.getData("gUser","UserNo",userId,function(user){
                        var newCredits = parseInt(user.QuestionCredits||"0")+parseInt(result.CardPrice||0)*1000;
                        cb(null,newCredits);
                    })
                }else{
                    cb(true);
                }
            },function(credit,cb){
                var newObj = {
                    QuestionCredits:credit
                };
                dal.setData("gUser","UserNo",userId,newObj,function(result){
                    cb(null,credit);
                });
            }
        ],function(err,result){
            if(err){
                return response.endJson({
                    err:1,
                    msg:"充值错误,请联系管理员"
                })
            }else{
                return response.endJson({
                    msg:"充值成功,您的积分为:"+result
                })
            }
        });
    },
    getCreditBack:function(postString,header,response){
        var subUserNo = _util.getQueryString(postString,"subUserNo");
        var userNo = header.getSession("User").UserNo;
        if(subUserNo){
            async.waterfall([
                function(cb){
                    dal.getData("gUser","UserNo",subUserNo,function(subUser){
                        if(subUser){
                            cb(null,subUser.QuestionCredits>=0?subUser.QuestionCredits:0);
                        }else{
                            cb(true);
                        }
                    });
                },
                function(result,cb){
                    dal.getData("gUser","UserNo",userNo,function(user){
                        if(user){
                            var credit = parseInt(user.QuestionCredits||0)+parseInt(result||"0");
                            return cb(null,credit);
                        }
                        cb(true);
                    })
                },
                function(credit,cb){
                    dal.setData("gUser","UserNo",userNo,{QuestionCredits:credit},function(result){
                        cb(null,credit);
                    })
                    dal.setData("gUser","UserNo",subUserNo,{QuestionCredits:0});
                }
            ],function(err,result){
                if(err) return response.endJson({
                    err:1,
                    msg:"回收积分发送错误,请联系管理员"
                });
                return response.endJson({
                    msg:"回收积分成功,您当前的积分是:"+result
                })
            });
        }else{
            response.endJson({
                err:1,
                msg:"子账户错误"
            })
        }
    },
    updateSubUserInfo:function(postString,header,response){
        var user = header.get("user");
        var newObj = {
            EndDate:user.EndDate,
            UserName:user.UserName
        };
        dal.setData("gUser","UserNo",user.UserNo,newObj,function(result){
            response.endJson({
                msg:"修改成功"
            })
        });
    },
    generateCard:function(postString,header,response){
        var cardAmount = parseInt(_util.getQueryString(postString,"cardAmount")||"0");
        var cardPrice = parseInt(_util.getQueryString(postString,"cardPrice")||"0");
        var userNo = header.getSession("User").UserNo;
        var sum = cardAmount*cardPrice*1000;
        if(cardAmount==0||cardPrice==0){
            return response.endJson({
                err:1,
                msg:"生成的卡数量或者卡单价错误,生成失败"
            })
        }
        async.waterfall([
            function(cb){
                dal.getData("gUser","UserNo",userNo,function(user){
                    var userCredit = parseInt(user.QuestionCredits||"0");
                    if(sum>userCredit){
                        cb(true);
                    }else{
                        for(var i=0;i<cardAmount;i++){
                            var card = _util.createCard();
                            card.Alipay = user.UserNo;
                            card.CardPrice = cardPrice;
                            mongo.insert({
                                collection:"gCard",
                                newObject:card
                            })
                        }
                        var left = userCredit - sum;
                        cb(null,left);
                    }
                });
            },function(result,cb){
                dal.setData("gUser","UserNo",userNo,{QuestionCredits:result},function(_res){
                    cb(null,null);
                });
            }
        ],function(err,result){
            if(err){
                response.endJson({
                    err:1,
                    msg:"生成失败"
                });
            }else{
                response.endJson({
                    msg:"生成成功"
                });
            }
        });
    },
    getDepositStatus:function(postString,header,response){
        var pageSize = parseInt( _util.getQueryString(postString,"pageSize")||10),
            pageIndex = parseInt(_util.getQueryString(postString,"pageIndex")||1);
        var userNo = header.getSession("User").UserNo||"_";
        async.parallel({
            user:function(cb){
                dal.getQesterRebateCredit(userNo,function(err,credits){
                    if(err) return cb(err);
                    cb(null,credits);
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
    },
    deposit:function(postString,header,response){
        var userId = header.getSession("User").UserNo||"";
        var creditNo = _util.getQueryString(postString,"creditNo")||"";
        var cash = parseFloat(_util.getQueryString(postString,"cash")||"0");
        var remark = _util.getQueryString(postString,"remark")||"";
        var rebateCredit = cash*1000;
        if(userId&&creditNo&&cash){
            if(cash<1) return response.endJson({
                err:1,
                msg:"每次提现需要大于1元钱"
            })
            async.parallel({
                user:function(cb){
                    dal.getQesterRebateCredit(userId,function(err,credit){
                        if(credit<rebateCredit){
                            cb(1)
                        }else{
                            cb(null,credit);
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
                    var msg = "你的返利积分不足以扣取提现消耗的积分";
                    if(err==2) msg="你今天的提现次数已使用完(一天最多提现两次)";
                    if(err==3) msg="此提现号重复,确认后联系管理员";
                    return response.endJson({
                        err:1,
                        msg:msg
                    })
                }
                async.waterfall([
                    function(cb){
                        dal.gUserCreditUpdate(userId,"HistoryCredits",(rebateCredit),function(){
                            cb(null,null);
                        });
                    },function(lastResult,cb){
                        var depositRecord = _util.createDepositRecord();
                        depositRecord.UserNo = userId;
                        depositRecord.CreditNo = creditNo;
                        depositRecord.Cash = cash;
                        depositRecord.Remark=remark;
                        var opt={
                            collection:"gDeposit",
                            newObject:depositRecord
                        }
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
    getUserItemList:function(postString,header,response){
        var userNo = header.getSession("User").UserNo;
        var opt={
            collection:"gGameItem",
            query:{
                "UserItemList.UserNo":userNo
            }
        };
        dal.loadPage(opt,function(result){
            var arr=[];
            result.result.forEach(function(obj){
                obj.UserItemList.forEach(function(_obj){
                    if(_obj.UserNo==userNo){
                        arr.push(_obj);
                    }
                });
            });
            response.endJson({
                list:arr
            });
        });
    },
    updateUserItem:function(postString,header,response){
        var userNo = header.getSession("User").UserNo;
        var userItem = header.get("UserItem");
        var remark = userItem.Remark||"",
            timeOut = userItem.TimeOut||0,
            checkStr = userItem.CheckStr||"",
            gItemNo = parseInt(userItem.gItemNo)||0;
        if(gItemNo){
            dal.getData("gGameItem","gItemNo",gItemNo,function(gItem){
                if(!gItem){
                    return response.endJson({
                        err:1,
                        msg:"数据错误,修改失败"
                    })
                }
                if(typeof(gItem.UserItemList)=="string"){
                    try{
                        gItem.UserItemList = eval("("+gItem.UserItemList+")");
                        if(typeof(gItem.UserItemList)!="object")
                            gItem.UserItemList=[];
                    }
                    catch(e){
                        utility.handleException(e);
                        gItem.UserItemList=[];
                    }
                }
                if(!gItem.UserItemList){
                    gItem.UserItemList=[];
                }
                var target = gItem.UserItemList.Find(function(item){
                    return item.UserNo==userNo;
                })
                if(target){
                    target.CheckStr = checkStr||"";
                    target.Remark = remark||"";
                    target.TimeOut=timeOut||0;
                }else{
                    return response.endJson({
                        err:1,
                        msg:"数据错误,修改失败"
                    })
                }
                var newObject={
                    UserItemList:gItem.UserItemList
                };
                dal.setData("gGameItem","gItemNo",gItemNo,newObject,function(){
                    response.endJson({
                        err:0,
                        msg:"修改成功"
                    })
                })
            });
        }else{
            response.endJson({
                err:1,
                msg:"数据错误,修改失败"
            })
        }
    },
    remUserItem:function(postString,header,response){
        var userNo = header.getSession("User").UserNo;
        var gItemNo = parseInt(_util.getQueryString(postString,"gItemNo"))||0;
        if(gItemNo){
            dal.getData("gGameItem","gItemNo",gItemNo,function(gItem){
                if(!gItem){
                    return response.endJson({
                        err:1,
                        msg:"数据错误,修改失败"
                    })
                }
                if(typeof(gItem.UserItemList)=="string"){
                    try{
                        gItem.UserItemList = eval("("+gItem.UserItemList+")");
                        if(typeof(gItem.UserItemList)!="object")
                            gItem.UserItemList=[];
                    }
                    catch(e){
                        utility.handleException(e);
                        gItem.UserItemList=[];
                    }
                }
                if(!gItem.UserItemList){
                    gItem.UserItemList=[];
                }
                var arr = gItem.UserItemList.filter(function(item){
                    return item.UserNo!=userNo;
                });
                var newObject={
                    UserItemList:arr
                };
                dal.setData("gGameItem","gItemNo",gItemNo,newObject,function(){
                    response.endJson({
                        err:0,
                        msg:"修改成功"
                    })
                })
            });
        }else{
            response.endJson({
                err:1,
                msg:"数据错误,修改失败"
            })
        }
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
    var userType = header.getSession("User").UserType;
    if(userType!=_util.userType.Question&&userType!=_util.userType.SubQuestionUser){
        return response.endJson({
            err:403,
            msg:"无权限访问此页面",
            redirectTo:"#/login"
        })
    }
    if(postString.indexOf("getSubUserList;")>=0){
        _handler.getSubUserList(postString,header,response);
    }else if(postString.indexOf("disabledSubUser")>=0){
        _handler.disabledSubUser(postString,header,response);
    }else if(postString.indexOf("isShow")>=0){
        _handler.isShow(postString,header,response);
    }else if(postString.indexOf("getOrderList")>=0){
        _handler.getOrderList(postString,header,response);
    }else if(postString.indexOf("getRebateList")>=0){
        _handler.getRebateList(postString,header,response);
    }else if(postString.indexOf("getQuestionList")>=0){
        _handler.getQuestionList(postString,header,response);
    }else if(postString.indexOf("GetPersonProfiles")>=0){
        _handler.GetPersonProfiles(postString,header,response);
    }else if(postString.indexOf("UpdatePersonProfiles")>=0){
        _handler.UpdatePersonProfiles(postString,header,response);
    }else if(postString.indexOf("getHistoryRecord")>=0){
        _handler.getHistoryRecord(postString,header,response);
    }else if(postString.indexOf("reCharge")>=0){
        _handler.reCharge(postString,header,response);
    }else if(postString.indexOf("getCreditBack")>=0){
        _handler.getCreditBack(postString,header,response);
    }else if(postString.indexOf("updateSubUserInfo")>=0){
        _handler.updateSubUserInfo(postString,header,response);
    }else if(postString.indexOf("generateCard")>=0){
        _handler.generateCard(postString,header,response);
    }else if(postString.indexOf("getDepositStatus")>=0){
        _handler.getDepositStatus(postString,header,response);
    }else if(postString.indexOf("deposit")>=0){
        _handler.deposit(postString,header,response);
    }else if(postString.indexOf("getUserItemList")>=0){
        _handler.getUserItemList(postString,header,response);
    }else if(postString.indexOf("updateUserItem")>=0){
        _handler.updateUserItem(postString,header,response);
    }else if(postString.indexOf("remUserItem")>=0){
        _handler.remUserItem(postString,header,response);
    }else{
        response.end("Instruction Error");
    }

}

module.exports.quester = main;

