/**
 * Created by Administrator on 2014/9/28.
 */
/**
 * Created by Administrator on 2014/7/12.
 */

var dal = require("./dataAdapter.js"),
    async = require("async"),
    mongodb  = require("../lib/mongoClient.js"),
    _util = require("./comLib.js").util;

function main(postString,header,response){
    if(postString.indexOf("userLoginByA;")>=0){
        _handler.userLoginByA(postString,header,response)
    }else if(postString.indexOf("userRegister;")>=0){
        _handler.userRegister(postString,header,response)
    }else if(postString.indexOf("userIdCheckExists;")>=0){
        _handler.userIdCheckExists(postString,header,response)
    }else{
        response.end();
    }
}

var _handler = {
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
    }
};

module.exports.common=main;