/**
 * Created by Huang on 2014/6/11.
 */

var dal = require("./dataAdapter.js"),
    async = require("async"),
    fs = require("fs"),
    mongo  = require("../lib/mongoClient.js"),
    Grid = require("mongodb").Grid,
    path = require("path"),
    _util = require("./comLib.js").util;



var _handler = {
    postQuestion:function(postString,header,response){
        var uid = _util.getQueryString(postString,"UserId")||
                    _util.getQueryString(postString,"UserNo")||
                    _util.getQueryString(postString,"账号")||
                    _util.getQueryString(postString,"帐号")||"";

        var pwd = _util.getQueryString(postString,"Password")||
            _util.getQueryString(postString,"Pwd")||
            _util.getQueryString(postString,"密码")||"";

        var ParentUserNo = _util.getQueryString(postString,"父账号")||
            _util.getQueryString(postString,"ParentUserNo")||
            _util.getQueryString(postString,"PUserNo")||"";

        var RebateUserNo = _util.getQueryString(postString,"RebateUserNo")||
            _util.getQueryString(postString,"RUserNo")||
            _util.getQueryString(postString,"返利账号")||"";

        var questionType = _util.getQueryString(postString,"题型")||
            _util.getQueryString(postString,"QuestionType")||
            _util.getQueryString(postString,"QType")||
            _util.getQueryString(postString,"Type")||
            _util.getQueryString(postString,"gItemNo")||"";
        if(questionType) questionType=parseInt(questionType);

        var timeOut = _util.getQueryString(postString,"TimeOut")||
            _util.getQueryString(postString,"超时时间")||
            _util.getQueryString(postString,"Timeout")||
            _util.getQueryString(postString,"超时秒数")||"";
        if(timeOut) timeOut = parseInt(timeOut)||0;

        var md5FromClient = header.get("imageMd5")||"";

        var checkStr = _util.getQueryString(postString, "CheckStr")||"";
        var fileExtName="";
        var MACNo = _util.getQueryString(postString,"MAC");

        //header.setSession((new Date()).getTime(),"Current Time:"+(new Date()));
        if(!uid) return response.end(_util.err(-103));
        if(!pwd) return response.end(_util.err(-104));
        if(pwd.length<32) pwd = utility.MD5(pwd);

        var needSet = false;

        async.parallel({
            gamer:function(callback){
                dal.getData("gUser","UserNo",uid,function(g){
                    var code = 0;
                    if(g){
                        if (pwd.toUpperCase() != g.Password.toUpperCase())//md5密码皆转为大写再比较
                        {//密码错误
                            code = -101;
                        }
                        if (!code&& g.Auditing.toString() != "true")
                        {//账号被冻结
                            code = -105;
                        }
                        if (!code&&g.QuestionCredits < 1)
                        {//表示积分不够
                            code = -111;
                        }
//                        if (!code&& g.MaxQQty >= 5 && g.LastUnAnswerQty > g.MaxQQty)
//                        {//未答数超过所设置的上限
//                            code = -204;
//                        }
//                        if (!code && (g.UserType == 4) && (ParentUserNo != "") && (ParentUserNo != g.ParentUserNo))
//                        {//子账号指定的父账号错误(子账号也可单独使用，不指定父账的话)
//                            code = -201;
//                        }
                        var now = (new Date()).getTime();
                        if (!code&&(g.UserType == 3)&& (g.BeginDate > now || g.EndDate < now))
                        {//账号过期判定
                            code = -108;
                        }
                        if(g.UserType!=_util.userType.SubQuestionUser) RebateUserNo = "";
                    }else{
                        code = -101;
                    }
                    if(code) {
                        callback(null, {
                                code:code,
                                item:g
                            });
                    }else if(RebateUserNo){
                        dal.getData("gUser","UserNo",RebateUserNo,function(_g) {
                            //if(_g==null||_g==undefined||_g.UserNo!=RebateUserNo){
                            if(!_g){
                                callback(null,{
                                    code:-202,
                                    item:g
                                });
                            }else{
                                callback(null,{
                                    item:g
                                });
                            }
                        })
                    }else{
                        callback(null,{
                            item:g
                        });
                    }
                })
            },
            gameItem:function(callback){
                dal.getData("gGameItem","gItemNo",questionType,function(gi){
                    if(gi){
                        if(typeof(gi.UserItemList)=="string"){
                            try{
                                gi.UserItemList = eval("("+gi.UserItemList+")");
                                if(typeof(gi.UserItemList)!="object")
                                    gi.UserItemList=[];
                            }
                            catch(e){
                                utility.handleException(e);
                                gi.UserItemList=[];
                            }
                        }
                        if(!gi.UserItemList){
                            gi.UserItemList=[];
                        }
                        if(RebateUserNo){
                            var temp = gi.UserItemList.Find(function(item){
                                return item.UserNo==RebateUserNo;
                            });
                            if(temp){
                                gi.TakeCredits1 = temp.Credits||gi.TakeCredits1;
                                gi.CheckStr = temp.CheckStr||gi.CheckStr;
                                gi.TimeOut = temp.TimeOut||gi.TimeOut;
                                gi.gItemName = temp.Remark||gi.gItemName;
                                gi.Discount = temp.Discount||0;
                            }else{
                                needSet = true;
                            }
                        }
                        if(false&&gi.MaxQQty >= 5 && gi.UnAnswerQty > gi.MaxQQty){//todo 暂时不进这个条件
                            callback(null,{
                                code:-202,
                                item:gi
                            });
                        }else if(gi.CheckStr){
                            checkStr = ";" + checkStr.toUpperCase() + ";";
                            var giCheckStr = ";" + gi.CheckStr.toUpperCase() + ";";
                            if (giCheckStr.indexOf(checkStr) < 0)
                            {
                                callback(null, {
                                    code:-203,
                                    item:gi
                                });//表示要求提供的验证字符串无效
                            }else{
                                callback(null,{
                                    item:gi
                                });
                            }
                        }else {
                            callback(null, {
                                item:gi
                            });
                        }
                    }else{
                        callback(null,{
                            code:-113,
                            item:gi
                        });
                    }
                });
            },
            mac:function(callback){
                if(MACNo){
                    dal.getData("gDisableByMACNo","MACNo",MACNo,function(m){
                        if(m){
                            callback(null,{
                                code:-107
                            });
                        }else{
                            callback(null,{});
                        }
                    });
                }else{
                    callback(null,{})
                }
            }
        },function(err,data){
            if(data.gamer.code){
                response.end(_util.err(data.gamer.code));
            }else if(data.gameItem.code){
                response.end(_util.err(data.gameItem.code));
            }else if(data.mac.code){
                response.end(_util.err(data.mac.code));
            }else{
                //[保存图片,
                //保存题目]
                //返回题号
                var gi =data.gameItem.item;
                var userType = data.gamer.item.UserType;
                async.waterfall([function(cb) {
                    var keys = Object.keys(header.files || {});
                    if (keys.length > 0){
                        var _filePath = header.files[keys[0]].path;
                        //fileExtName = path.extname( header.files[keys[0]].name);
                        fs.readFile(_filePath, function (_err, data) {
                            if (_err) {
                                console.dir(_err);
                                return cb(null, _err, null);
                            }
                            var md5Str = md5FromClient|| utility.MD5(data);
                            mongo.mongo(function (__err, db, release) {
                                if(__err) return cb(null,__err,null);
                                var grid = new Grid(db, "fs");
                                grid.put(data, {
                                    chunk_size:data.length
                                }, function (___err, result) {
                                    //console.dir(result);
                                    release();
                                    if (___err) {
                                        cb(null, ___err, null)
                                    }else {
                                        cb(null, null, {
                                            gi: gi,
                                            _id: result._id.toString(),
                                            imageMd5: md5Str,
                                            userType:userType
                                        });
                                    }
                                    fs.unlink(_filePath);
                                })
                            })
                        })
                    }else{
                        cb(null, new Error(), null);
                    }
                },
                function(err,result,cb){
                    if(err){
                        //保存图片出现错误
                        cb(null,{
                            err:-133,
                            QuestionNo:null
                        });
                    }else{
                        var gi = result.gi;
                        var QuestionNo = _util.generateQuestionNo();
                        //var QuestionId =_util.getQueryString(postString, "QuestionId")||utility.Guid();//题目Id
                        var QuestionDate = (new Date()).getTime();
                        var IP = "IP";//IP
                        var ServerNo = configuration.config.runtime.ServerNo||"A";//HttpContext.Current.Application["ServerNo"].ToString();
                        var ImageMd5_32 = result.imageMd5||"";
                        var dllId = _util.getQueryString(postString, "dllId")||"";//dllId
                        var AnswerList = _util.getQueryString(postString, "AnswerList")||"";//用户自定义答案列表

                        ////////////////////////////////////////////////////////////////////////////////////
                        //4、加入缓存TQuestionList---------------------------------------------------------
                        //TQuestionList qList = ansayLib.gQuestionList;//(TQuestionList)HttpContext.Current.Application["QuestionList"];
                        var q = _util.createQuestion();
                        q.RegExp = gi.RegExp;
                        q.QuestionNO = QuestionNo;
                        q.QuesterId = uid;
                        q.TimeOut = timeOut||gi.TimeOut;
                        q.dllId = dllId;
                        //if (q.dllId == "") q.SourceType = 1;//无插件题(http request题)
                        q.QuestionDate = QuestionDate;//问题时间
                        //q.ImageType = fileExtName;
                        q.ImageMd5_32 = ImageMd5_32;
                        q.gItemNo = gi.gItemNo;;
                        q.gItemType = gi.gItemType;
                        q.UserType =result.userType;
                        q.TakeCredits = gi.TakeCredits1;
                        q.AnswerCredits = gi.AnswerCredits1;
                        q.Remark = gi.gItemName;
                        q.Discount = gi.Discount||0;
                        q.MACNo = MACNo;
                        q.Script = gi.Script;;
                        q.AnswerList = AnswerList;
                        q.RebateUserNo = RebateUserNo;
                        q.gItemTypeOwner = RebateUserNo|| gi.UserNo||"system";
                        q.imgId = result._id||"";
                        cb(null, {
                            err:null,
                            QuestionNO: q.QuestionNO,
                            gItemNo:q.gItemNo,
                            TakeCredits: q.TakeCredits,
                            Remark:q.Remark
                        });
                        dal.checkAnswerAndSetToList(q,ImageMd5_32);
                        dal.setData("gQuestion","QuestionNO",QuestionNo,q,function(){
                            //todo 需要注释掉
                            //utility.debug("Set A New Data")
                        })
                        dal.setBackUpQuestion(q);
                        dal.expire("gQuestion", q.QuestionNO,180);
                    }
                }],
                function(err,result){
                    if(result.err){
                        response.end(_util.err(result.err));
                    }else {
                        response.end(result.QuestionNO);
                    }
                    if(needSet&&RebateUserNo){//自动生成UserItem
                        var gItemNo = parseInt(result.gItemNo)||0;
                        if(!gItemNo) return;
                        dal.getData("gGameItem","gItemNo",gItemNo,function(gItem){
                            var userItem={
                                gItemNo:gItemNo,
                                UserNo:RebateUserNo,
                                Discount:0.1,
                                Credits:result.TakeCredits,
                                Remark:result.Remark,
                                TimeOut:0
                            };
                            var arr =[];
                            if(typeof(gItem.UserItemList)=="string"){
                                try{
                                    arr = eval("("+gItem.UserItemList+")");
                                }
                                catch(e){
                                }
                            }
                            if(!(arr instanceof Array)){
                                arr=[];
                            }
                            arr.push(userItem);
                            var newObject ={
                                UserItemList:arr
                            };
                            dal.setData("gGameItem","gItemNo",gItemNo,newObject);
                        });
                    }
                });
            }
        });
    },
    getAnswer:function(postString,header,response){
        var questionNo = _util.getQueryString(postString,"QuestionNO")||
            _util.getQueryString(postString,"QuestionNo")||"";
        if(questionNo){
            dal.getData("gQuestion","QuestionNO",questionNo,function(question){
                if(question){
                    var currentTime = new Date().getTime();
                    var questionTime =parseInt(question.QuestionDate)+parseInt(question.TimeOut)*1000;
                    if(currentTime>questionTime&&question.Status!=_util.Status.TimeOut){
                        dal.setQuestionTimeOut(question);
                    }
                    return response.end(question.sAnswer);
                }
                response.end("#QuestionNoError");

            });
        }else{
            response.end("#QuestionNoError");
        }
    },
    getCredit:function(postString,header,response){
        var uid = _util.getQueryString(postString,"UserId")||
                   _util.getQueryString(postString,"UserNo")||
                   _util.getQueryString(postString,"账号")||
                   _util.getQueryString(postString,"账号")||"";

        var pwd =  _util.getQueryString(postString,"Password")||
                    _util.getQueryString(postString,"Pwd")||
                    _util.getQueryString(postString,"密码")||"";

        var gItemNo = _util.getQueryString(postString,"题型")||
                    _util.getQueryString(postString,"QuestionType")||
                    _util.getQueryString(postString,"QType")||
                    _util.getQueryString(postString,"Type")||
                    _util.getQueryString(postString,"gItemNo")||"0";

        if(!uid) return response.end(_util.err(-103));
        if(!pwd) return response.end(_util.err(-104));
        if(isNaN(gItemNo)) return response.end(_util.err(-113));

        pwd = utility.MD5(pwd);

        async.waterfall([function(cb){
            dal.getData("gUser","UserNo",uid,function(user){
                if(user){
                    if(user.Password.toUpperCase()!=pwd.toUpperCase()){
                        return cb(null,-101,null);
                    }
                    if(user.Auditing.toString()!="true"){
                        return cb(null,-105,null);
                    }
                    var nowTime = (new Date()).getTime();
                    if(!user.BeginDate||!user.EndDate||(user.BeginDate>nowTime)||(user.EndDate<nowTime)){
                        return cb(null,-108,null);
                    }
                    var questionCredits = user.QuestionCredits||0;
                    if(gItemNo==0){
                        if(questionCredits<=0) questionCredits = 0;
                        return cb(null,questionCredits,null);
                    }else{
                        return cb(null,null,{
                            questionCredits:questionCredits,
                            gItemNo:gItemNo,
                            parentUserNo:user.ParentUserNo
                        });
                    }
                }else{
                    cb(null,-101,null);
                }
            });
        },
        function(code,result,cb){
            if(result){
                var questionCredits = result.questionCredits;
                var gItemNo = result.gItemNo;
                var parentUserNo = result.parentUserNo;
                if(gItemNo) gItemNo=parseInt(gItemNo);
                dal.getData("gGameItem","gItemNo",gItemNo,function(gi){
                    if(gi){
                        //var gItemType = gi.gItemType;
                        if(typeof(gi.UserItemList)=="string"){
                            try{
                                gi.UserItemList = eval("("+gi.UserItemList+")");
                            }
                            catch(e){
                                gi.UserItemList=[];
                            }
                        }
                        var temp = gi.UserItemList.Find(function(item){
                            return item.UserNo==parentUserNo;
                        })||{};
                        var takeCredits =temp.Credits||gi.TakeCredits||gi.TakeCredits1;
                        questionCredits = questionCredits - takeCredits;
                        if(questionCredits<0){
                            cb(null,-111)
                        }else{
                            cb(null,questionCredits);
                        }
                    }else{
                        cb(null,-113);
                    }
                });
            }else {
                return cb(null, code);
            }
        }],function(err,result){
                result = result||"-110";
                if(result<0){
                    return response.end(_util.err(result));
                }
                response.end(result.toString());
        });


    },
    reportError:function(postString,header,response){
        var questionNo = _util.getQueryString(postString,"QuestionNO")||
                        _util.getQueryString(postString,"No")||
                        _util.getQueryString(postString,"题号")||
                        _util.getQueryString(postString,"QNo")||"";

        if(!questionNo){
            return response.end(_util.err(-141));
        }
        dal.getData("gQuestion","QuestionNO",questionNo,function(question){
            if(!question){
                //题号有错
                return response.end(_util.err(-141));
            }
            if(question.Status== _util.Status.Unknown){
                //Unkown状态
                return response.end(_util.err(-143));
            }
            if(question.Status== _util.Status.TimeOut){
                //TimeOut状态
                return response.end(_util.err(-148));
            }
            if(question.Status== _util.Status.Answered){
                response.end("1");
                //已回答
                //1 gRebate
                //2 gUserTotal
                //3 g
                var questionNo =question.QuestionNO;
                var qUser = question.QuesterId||"";
                var aUser = question.AnswererId||"";
                var qCredit = parseInt(question.TakeCredits)||0;
                var aCredit = parseInt(question.AnswerCredits)||0;
                var gItemTypeOwner = question.gItemTypeOwner||"";
                var md5Str = question.ImageMd5_32||"";
                var gItemNo = question.gItemNo||"";
                var questionDate =parseInt(question.QuestionDate);
                async.parallel([
                    function(cb){
                        //for gUser
                        dal.getData("gUser","UserNo",qUser,function(user){
                            if(user){
                                dal.gUserCreditUpdate(user.UserNo,"QuestionCredits",qCredit)
                            }
                        });
                        dal.getData("gUser","UserNo",aUser,function(user){
                            if(user){
                                dal.gUserCreditUpdate(user.UserNo,"QuestionCredits",-aCredit*3)
                            }
                        });
                        cb(null,null);
                    },
                    function(cb){
                        //for gUserTotal
                        dal.gUserTotalSetCredits(qUser,questionDate,qCredit, _util.Status.Error);
                        dal.gUserTotalSetCredits(aUser,questionDate,aCredit*3,_util.Status.Error);//回答超时反扣3倍
                        cb(null,null);
                    },
                    function(cb){
                        //for gRebate
                        var opt={
                            collection:"gRebate",
                            query:{
                                gItemNo:gItemNo.toString(),
                                QuestionDate: _util.today().toString(),
                                gItemTypeOwner: question.gItemTypeOwner
                            },
                            newObject:{
                                $inc:{
                                    ReportErrorCount:1
                                }
                            }
                        };
                        mongo.upsert(opt,function(err,result){
                            console.dir({
                                err:err,
                                result:result,
                                msg:"报错gRebate设置完毕"
                            });
                        });
                        cb(null,null);
                    },
                    function(cb){
                        //for removeMd5Record
                        //dal.getData("gImageMd5");
                        dal.removeData("gImageMd5Rec","ImageMd5",md5Str,function(err,result){
                            console.dir({
                                err:err,
                                result:result,
                                msg:"删除MD5库"
                            });
                        });
                        cb(null,null);
                    }
                ],function(err,result){
                    var newObject={
                        Status:_util.Status.Error
                    };
                    dal.setData("gQuestion","QuestionNO",questionNo,newObject);
                    dal.setBackUpQuestion(newObject,questionNo);
                });

            }else{
                //回应正在答题
                return response.end(_util.err(-146));
            }
        });
    },
    registSubUser:function(postString,header,response){
        var userNo = _util.getQueryString(postString,"UserNo")||
            _util.getQueryString(postString,"UserId")||
            _util.getQueryString(postString,"账号")||
            _util.getQueryString(postString,"帐号")||"";

        if(!userNo) {
            return response.end(_util.err(-151))
        }

        var pwd = _util.getQueryString(postString,"Password")||
            _util.getQueryString(postString,"Pwd")||
            _util.getQueryString(postString,"密码")||"";

        if(!pwd){
            return response.end(_util.err(-152))
        }

        var mac = _util.getQueryString(postString,"MacNo")||"";

        var parentUserNo = _util.getQueryString(postString,"ParentUserNo")||
            _util.getQueryString(postString,"ParentUserNo")||
            _util.getQueryString(postString,"PUserId")||
            _util.getQueryString(postString,"PUserNo")||
            _util.getQueryString(postString,"父账号")||
            _util.getQueryString(postString,"父帐号")||"";
        if(!parentUserNo){
            return response.end(_util.err(-251));
        }


        var parentPwd = _util.getQueryString(postString,"ParentPassword")||
            _util.getQueryString(postString,"ParentPwd")||
            _util.getQueryString(postString,"PPwd")||
            _util.getQueryString(postString,"父账号密码")||
            _util.getQueryString(postString,"父密码")||"";
        if(!parentPwd){
            return response.end(_util.err(-251));
        }

        var useDays = parseInt(_util.getQueryString(postString,"Days")||
            _util.getQueryString(postString,"days")||
            _util.getQueryString(postString,"有效天数")||"0");
        if(!useDays){
            return response.end(_util.err(-252));
        }

        var userQQ = _util.getQueryString(postString,"QQ")||
            _util.getQueryString(postString,"qq")||"";

      async.waterfall([
          function(cb){
              dal.getData("gUser","UserNo",userNo,function(user){
                  if(user){
                      cb(-153,null);
                  }else{
                      cb(null,null);
                  }
              });
          },
          function(result,cb){
              dal.getData("gUser","UserNo",parentUserNo,function(parentUser){
                  if(parentPwd.length!=32) parentPwd = utility.MD5(parentPwd);
                  if(!parentUser
                      ||parentUser.Password!=parentPwd
                      ||parentUser.UserType!=_util.userType.Question){
                      //无效父帐号
                      cb(-251,null);
                  }else{
                      var obj = _util.createUser();
                      var nowTime = new Date().getTime();
                      if(pwd.length!=32) pwd = utility.MD5(pwd);
                      obj.UserNo = userNo;
                      obj.UserName = userNo;
                      obj.Password = pwd;
                      obj.UserType = _util.userType.SubQuestionUser;
                      obj.ParentUserNo = parentUser.UserNo;
                      obj.MacNO = mac;
                      obj.BeginDate = nowTime;
                      obj.EndDate = nowTime+useDays*24*3600*1000;
                      obj.UserQQ = userQQ;
                      dal.setData("gUser","UserNo",userNo,obj,function(user){
                          if(user){
                              cb(null,1);
                          }else{
                              cb(-150,null);
                          }
                      });
                  }
              });
          }
      ],function(err,result){
          if(err){
              if(err<0){
                  response.end(_util.err(err));
              }else{
                  response.end(_util.err(-150));
              }
          }else{
              response.end("1");
          }
      });
    },
    reCharge:function(postString,header,response){
        var cardNo = _util.getQueryString(postString,"CardNo");
        var userNo = _util.getQueryString(postString,"UserNo");
        async.parallel({
            card:function(cb){
                var opt={
                    collection:"gCard",
                    query:{
                        CardNo:cardNo
                    }
                };
                mongo.findOne(opt,function(err,card){
                    var result = {
                        result:card
                    };
                    if(!card){
                        result.err=-171;
                    }
                    if(!result.err&&card.Auditing){
                        result.err=-172;
                    }
                    cb(null,result);
                });
            },
            user:function(cb){
                dal.getData("gUser","UserNo",userNo,function(user){
                    var result ={
                        result:user
                    };
                    if(!user){
                        result.err=-173;
                    }
                    cb(null,result);
                });
            }
        },function(err,result){
            var user = result.user.result;
            var card = result.card.result;
            var isError =result.card.err||result.user.err;
            if(isError){
                return response.end(_util.err(isError));
            }
            if(user.UserType==_util.userType.SubQuestionUser
                && card.Alipay!=user.ParentUserNo){
                return response.end(_util.err(-174));
            }
            response.end("1");
            async.parallel({
                user:function(cb){
                    var opt={
                        QuestionCredits:parseInt(user.QuestionCredits)+ parseInt(card.CardPrice)*1000
                    };
                    dal.setData("gUser","UserNo",user.UserNo,opt,function(_result){
                        var __result = {
                            result:_result
                        };
                        if(!_result) __result.err = true;

                        cb(null,__result);
                    });
                },
                card:function(cb){
                    var opt={
                        collection:"gCard",
                        query:{
                            CardNo:card.CardNo
                        },
                        newObject:{
                            $set: {
                                Auditing: true,
                                CardTime: (new Date()).getTime(),
                                CardUser: userNo,
                                UserType: parseInt(user.UserType)
                            }
                        }
                    };
                    mongo.update(opt,function(err,_result){
                        var __result = {
                            result:_result
                        };
                        if(!_result) __result.err = true;
                        cb(null,__result);
                    });
                },
                order:function(cb){
                    var newObj = _util.createOrder();
                    var price = card.CardPrice;
                    newObj.UserNo = userNo;
                    newObj.CardPrice = price;
                    newObj.TotalPrice = price;
                    newObj.TiFen = price*1000;
                    newObj.CardNo = card.CardNo;
                    newObj.ParentUserNo = user.ParentUserNo||"";
                    newObj.gmt_payment = (new Date()).getTime();
                    newObj.BuyTime = (new Date()).getTime();
                    var opt={
                        collection:"gOrder",
                        newObject:newObj
                    };
                    mongo.insert(opt,function(err,_result){
                        var __result = {
                            result:_result
                        };
                        if(!_result) __result.err = true;
                        cb(null,__result);
                    });
                }
            },function(err,result){
                if(result.user.err||result.card.err||result.order.err){
                    //Todo log充值出错
                    console.log("充值出错");
                }else{
                    //Todo 充值成功
                    console.log("充值成功");
                }
            });
        });
    }
};

function main(postString,header,response){
    if(postString.indexOf("SendFile;")>=0
        || postString.indexOf("发送文件;")>=0
        || postString.indexOf("发送图片;")>=0
        || postString.indexOf("发送截图;")>=0
        || postString.indexOf("SendImage;")>=0)
    {
        _handler.postQuestion(postString,header,response);
    }else if(postString.indexOf("GetAnswer;")>=0 || postString.indexOf("获取答案;")>=0){
        _handler.getAnswer(postString,header,response);
    }else if(postString.indexOf("GetCredits;")>=0 || postString.indexOf("查询积分;")>=0){
        _handler.getCredit(postString,header,response);
    }else if(postString.indexOf("Report;")>=0 || postString.indexOf("ReportError;")>=0|| postString.indexOf("报错;")>=0){
        _handler.reportError(postString,header,response);
    }else if (postString.indexOf("RegSubUser;")>=0 || postString.indexOf("CreateSubUser;")>=0){
        _handler.registSubUser(postString,header,response);
    }else if(postString.indexOf("Recharge;")>=0 || postString.indexOf("充值;")>=0){
        _handler.reCharge(postString,header,response);
    }else{
        response.end();
    }

}

module.exports.once = main;