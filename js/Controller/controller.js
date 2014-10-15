/**
 * Created by Administrator on 2014/7/13.
 */

var appControllers = angular.module("appControllers",["ngRoute","ngSanitize","appServices","ui.bootstrap"]);

if(!window.ModalInstanceCtrl){
    window.ModalInstanceCtrl = function ($scope, $modalInstance, questionType,r_flag) {
        $scope.questionType = questionType;
        $scope.r_flag = r_flag;
        $scope.ok = function () {
            $modalInstance.close($scope.questionType);
        };
        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
        $scope.addDeveloper=function(){
            $scope.questionType.UserItemList = $scope.questionType.UserItemList||[];
            var obj={
                gItemNo:questionType.gItemNo,
                UserNo:"",
                Discount:0,
                Credits:questionType.TakeCredits1,
                Remark:questionType.Remark,
                TimeOut:questionType.TimeOut
            };
            $scope.questionType.UserItemList.push(obj);
        };
        $scope.removeDevelop=function(item){
            $scope.questionType.UserItemList =  $scope.questionType.UserItemList.filter(function(obj){
                return  obj.$$hashKey!=item.$$hashKey;
            })
        }
    };
}

appControllers.controller("indexCtrl",["$scope","admin",function($scope,admin){
    sessionStorage.removeItem("show");
    sessionStorage.removeItem("showQuestion")
}]);

appControllers.controller("loginCtrl",["$scope","$window","common",function($scope,$window,common){
    $scope.Login={};
    $scope.Register={};

    $scope.register = function() {
        if ($scope.Register.userPwd && $scope.Register.userPwd != $scope.Register.userPwd2) {
            return alert("密码不一致")
        }
        var macNo = guid();
        var postString = createPostString("userRegister", {
            userNo: $scope.Register.userNo.trim(),
            userPwd: $scope.Register.userPwd,
            userPwd2: $scope.Register.userPwd2,
            userQQNo: $scope.Register.QQNo,
            userType:$scope.Register.userType,
            macNo: macNo
        });
        common.send({postString: postString}, function (result) {
            if (result.err) {
                alert(result.msg);
            } else {
                alert(result.msg);
                localStorage.setItem($scope.Register.userNo.trim(), macNo)
            }
        })
    }

    $scope.Login.userId = "ansay";
    $scope.Login.pwd   ="123";

    $scope.login=function(){
        var macNo = localStorage.getItem($scope.Login.userId.trim());
        var postString = createPostString("userLoginByA",{
            UserId:$scope.Login.userId,
            Password:$scope.Login.pwd,
            MacNo:macNo
        });
        common.send({postString:postString},function(result){
            if(result.err){
                alert(result.msg);
                if(result.redirectTo){
                    $window.location = result.redirectTo;
                }
            }else{
                if(result.ResetMac){
                    localStorage.setItem($scope.Login.userId,result.ResetMac)
                }
                if(result.show){
                    sessionStorage.setItem("show",result.show)
                }else{
                    sessionStorage.removeItem("show")
                }
                $window.location = result.redirectTo;
            }
        })
    }

    $scope.keyPress = function(e){
        if(e.keyCode==13){
            $scope.login();
        }
    }

    $scope.isLegalUserNo = true;

    $scope.checkExists = function(){
        $scope.Register.userNo = $scope.Register.userNo&&$scope.Register.userNo.trim();
        if($scope.Register.userNo&&$scope.Register.userNo.trim()){
            var postString = createPostString("userIdCheckExists",{
                userNo:$scope.Register.userNo
            });
            common.send({postString:postString},function(result){
                if(result.err){
                    $scope.isLegalUserNo = false;
                }else{
                    $scope.isLegalUserNo = true;
                }
            })
        }else{
            $scope.isLegalUserNo = true;
        }
    }
}]);

appControllers.controller("answerCtrl",["$scope","answer","$window","$browser","$timeout",function($scope,answer,$window,$browser,$timeout){
    answer.send({postString:"check"},function(result){
        if(result.err){
            alert(result.msg);
            if(result.redirectTo){
                window.location = result.redirectTo;
            }
        }
    })
    window.ctx =  document.getElementById("imgCanvas").getContext("2d");
    $scope.isShow = isShow();

    $scope.list=[];
    $scope.currentQuestion = {};
    $scope.currentLeftTime = 0+"秒";
    $scope.timePromise =null;
    $scope.questionRequestPromise =null;
    $scope.hasQuestion =false;

    $scope.keyPress=function(e){
        if((e.keyCode==32|| e.keyCode==13)&& $scope.currentQuestion&& $scope.currentQuestion.QuestionNO&&$scope.answerTxt){
            $scope.putAnswer();
        }
    }

    $scope.fetchQuestion =function() {
        $scope.isOn = true;
        $scope.fetchQuest();
    }

    $scope.pause = function(){
        $scope.isOn = false;
    }

    $scope.skip=function(url){
        if($scope.hasQuestion||$scope.list.length>0){
            return alert("还有未答题目,请答完再跳转");
        }
        $scope.isOn=false;
        window.location = url;
    }

    $scope.putAnswer = function(flag) {
        if($scope.currentQuestion&&$scope.currentQuestion.RegExp){
            var reg = new RegExp($scope.currentQuestion.RegExp,"g");
            if(!flag&&!reg.test($scope.answerTxt)){
                return alert("请输入正确格式的答案");
            }
        }

        var pro = $scope.timePromise;
        if(pro){
            $timeout.cancel(pro);
        }
        $scope.currentLeftTime = "- 秒";
        //document.getElementById("imgQuestionShow").src="";
        clearCanvas();
        if(!flag&&(!$scope.answerTxt||!$scope.currentQuestion.QuestionNO)){
            return;
        }
        var opt = {
            QuestionNO: $scope.currentQuestion.QuestionNO,
            answerTxt: $scope.answerTxt
        };
        if(flag=="unknown"){
            opt.answerTxt="#UNKNOWN";
        }else if(flag=="timeout"){
            opt.answerTxt="#TimeOut";
        }
        var postString = {postString:createPostString("PostAnswer",opt)}
        $scope.answerTxt="";
        $scope.currentQuestion = {};
        answer.send(postString,function(result){
            if(!result.err){
                $scope.hasQuestion=false;
                $scope.fetchQuest();
            }
        });
    }

    $scope.fetchQuest = function(){
        if($scope.list.length>0&&!$scope.hasQuestion) {
            var question = $scope.list.pop();
            $scope.setQuestion(question);
        }
        if(!$scope.isOn) return;
        var postString = createPostString("GetQuestion");
        answer.send({postString:postString},function(result){
            if(!result.error){
                if (result.result) {
                    $scope.list.push(result.result);
                }
                if(!$scope.hasQuestion){
                    var question = $scope.list.pop();
                    $scope.setQuestion(question);
                }
            }
            if($scope.list.length<2) {
                if ($scope.questionRequestPromise) {
                    $timeout.cancel($scope.questionRequestPromise)
                }
                $scope.questionRequestPromise = $timeout($scope.fetchQuest, 1000);
            }
        });
    }

    function timer(index){
        index = index||0;
        if(index){
            var pro = $scope.timePromise;
            if(pro){
                $timeout.cancel(pro);
            }
            $scope.currentLeftTime = index+"秒";;
        }else{
            var currentTime = parseInt($scope.currentLeftTime||0);
            currentTime--;
            $scope.currentLeftTime = currentTime+"秒";
            if(currentTime<=0) {
                $scope.currentLeftTime = "已超时";
                $scope.putAnswer("timeout");
                return
            };
        }
        $scope.timePromise = $timeout(timer,1000)
    }

    $scope.timer = timer;

    $scope.setQuestion = function(question){
        focus();
        $scope.currentQuestion = question;
        var isJustShow = !question.Script;
        imgLoad(question.imgUrl,isJustShow);
        $scope.hasQuestion=true;
        var index = question.TimeOut - parseInt(question.QuestionDateSpan);
        timer(index);
        $scope.answerTempArr = [];
    }

    $scope.answerTempArr = [];

    $scope.setImagePoint = function(e){
        if($scope.answerTxt=="") $scope.answerTempArr = [];
        if(!$scope.currentQuestion.Script){
            return focus();
        }
        if($scope.answerTempArr.length<$scope.currentQuestion.Script){
            if(!e.offsetX){
                e = getOffset(e);
            }
            var point = e.offsetX + "," + e.offsetY;
            $scope.answerTempArr.push(point);
            $scope.answerTxt = $scope.answerTempArr.join("|");
            window.ctx.beginPath();
            window.ctx.arc(e.offsetX, e.offsetY, 10, 0, Math.PI*2, true);
            window.ctx.lineWidth = 2.0;
            window.ctx.strokeStyle = "#FF0000";
            window.ctx.stroke();
            focus();
        }else{
            $scope.answerTempArr = [];
            var isJustShow = !$scope.currentQuestion.Script;
            imgLoad($scope.currentQuestion.imgUrl,isJustShow);
            $scope.answerTxt="";
        }
    }

    function focus(){
        document.getElementById("appendedInputButton").focus();
    }

}]);

function imgLoad(imgData,justShowPic){
    if(justShowPic){
        var imgEle = document.getElementById("imgQuestionShow");
        imgEle.style.display=""
        imgEle.src=imgData;
        return;
    }
    var img = new Image();
    img.src = imgData;
    ctx.canvas.width = img.width;
    ctx.canvas.height = img.height;
    img.onload = function(){
        console.dir("draw");
        window.ctx.drawImage(this,0,0);
    }
}

function clearCanvas(){
    var width = ctx.canvas.width;
    var height = ctx.canvas.height;
    ctx.clearRect(0,0,width,height);
    var imgEle = document.getElementById("imgQuestionShow");
    imgEle.style.display="none"
}

function getOffset(e)
{
    var target = e.target;
    if (target.offsetLeft == undefined)
    {
        target = target.parentNode;
    }
    var pageCoord = getPageCoord(target);
    var eventCoord =
    {     //计算鼠标位置（触发元素与窗口的距离）
        x: window.pageXOffset + e.clientX,
        y: window.pageYOffset + e.clientY
    };
    var offset =
    {
        offsetX: eventCoord.x - pageCoord.x,
        offsetY: eventCoord.y - pageCoord.y
    };
    return offset;
}

function getPageCoord(element)    //计算从触发到root间所有元素的offsetLeft值之和。
{
    var coord = {x: 0, y: 0};
    while (element)
    {
        coord.x += element.offsetLeft;
        coord.y += element.offsetTop;
        element = element.offsetParent;
    }
    return coord;
}

appControllers.controller("answerProfilesCtrl",["$scope","answer",function($scope,answer){
    var postString = createPostString("GetAnswerProfiles");
    answer.send({postString:postString},function(result){
        if(result.err){
            alert(result.msg);
            if(result.redirectTo){
                window.location = result.redirectTo;
                return;
            }
        }

        var user = result.result
        user.RegTime = new Date(user.RegTime).toLocaleString();
        $scope.user =user;
    });
    $scope.isShow = isShow();
    $scope.update = function(flag){
        var opt = {};
        if(flag){
            opt.UserName = $scope.user.UserName;
            opt.UserQQ = $scope.user.UserQQ;
            opt.UserEmail = $scope.user.UserEmail;
            if(!opt.UserName&&!opt.UserQQ&&!opt.UserEmail) return;
        }else{
            opt.prePwd = $scope.prePwd;
            opt.updPwd1 = $scope.updPwd1;
            opt.updPwd2 = $scope.updPwd2;
            if(opt.updPwd1!=opt.updPwd2){
                return alert("密码不一致")
            }
            if(!opt.prePwd||!opt.updPwd1) return;
        }
        var postString = createPostString("UpdateAnswerProfiles",opt);
        answer.send({postString:postString},function(result){
            if(result.msg){
                return alert(result.msg)
            }
        });
    }
}]);

appControllers.controller("recentAnswerRecordsCtrl", ["$scope","answer", function ($scope,answer) {
    $scope.getStatuDesc = getQestionStatusDesc;

    $scope.isShow = isShow();

    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend({},{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("GetRecentAnswerRecords",newSearcher);
        answer.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);


} ]);

appControllers.controller("recentCreditRecordsCtrl",["$scope","$http","answer",function($scope,$http,answer){
    $scope.synopsis={};

    var pageSize = 10;
    var groupSize = 5;
    $scope.isShow = isShow();
    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend({},{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("GetRecentCreditRecords",newSearcher);
        answer.send({postString:postString},function(result){
            if(result.err){
                if(result.msg) {
                    alert(result.msg);
                }
                if(result.redirectTo){
                    window.location = result.redirectTo;
                }
            }else{
                $scope.creditRecords = result.result||[];
                $scope.recordSize = result.size;
                loadPage($scope.recordSize,pageNum)
                angular.forEach($scope.creditRecords,function(record){
                    record.sumCredit = record.QuestionCredits-record.ReportErrorCredits-record.TimeOutCredits;
                    record.payAmount = parseFloat((record.sumCredit/2000).toFixed(2));
                    $scope.synopsis.sumQuestionCount = ($scope.synopsis.sumQuestionCount||0) + record.QuestionCount;
                    $scope.synopsis.sumQuestionCredits = ($scope.synopsis.sumQuestionCredits||0) + record.QuestionCredits;
                    $scope.synopsis.sumTimeOutCount = ($scope.synopsis.sumTimeOutCount||0) + record.TimeOutCount;
                    $scope.synopsis.sumTimeOutCredits = ($scope.synopsis.sumTimeOutCredits||0) + record.TimeOutCredits;
                    $scope.synopsis.sumReportErrorCount = ($scope.synopsis.sumReportErrorCount||0) + record.ReportErrorCount;
                    $scope.synopsis.sumReportErrorCredits = ($scope.synopsis.sumReportErrorCredits||0) + record.ReportErrorCredits;
                    $scope.synopsis.sumNotSureCount = ($scope.synopsis.sumNotSureCount||0) + record.NotSureCount;
                    $scope.synopsis.sumCredit = ($scope.synopsis.sumCredit||0) + record.sumCredit;
                    $scope.synopsis.payAmount =  (parseFloat(($scope.synopsis.payAmount||0)) + record.payAmount).toFixed(2);
                })
            }
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };

    $scope.pageTo(1);

}]);

appControllers.controller("todayAnswerRecordsCtrl",["$scope","answer",function($scope,answer){

    var postString = createPostString("GetTodayAnswerRecords");
    answer.send({postString:postString},function(result) {
        if (result.err) {
            if (result.msg) {
                alert(result.msg);
            }
            if (result.redirectTo) {
                window.location = result.redirectTo;
            }
        }else{
            var temp = result.result||{};
            $scope.QuestionCount = temp.QuestionCount||0;
            $scope.QuestionCredits = temp.QuestionCredits||0;
            $scope.TimeOutCount = temp.TimeOutCount||0;
            $scope.TimeOutCredits = temp.TimeOutCredits||0;
            $scope.ReportErrorCount = temp.ReportErrorCount||0;
            $scope.ReportErrorCredits =  temp.ReportErrorCredits||0;
            $scope.NotSureCount =  temp.NotSureCount||0;
            $scope.sumCredit = $scope.QuestionCredits - $scope.TimeOutCredits - $scope.ReportErrorCredits;
            $scope.payAmount =  ($scope.sumCredit/2000).toFixed(2)||0;
        }
    })

    $scope.isShow = isShow();
}]);

appControllers.controller("subUserCtrl",["$scope","answer","$modal",function($scope,answer,$modal){
    $scope.records=[];
    $scope.isShow = isShow();
    $scope.searcher = {};
    //var pageS = 5;
    var pageSize = 10;
    var groupSize = 5;

    $scope.search=function(){
        initPage();
        $scope.pageTo(1);
    }

    $scope.disable=function(obj){
        var _status = obj.Auditing;
        var _postString = createPostString("disabledSubUser",{
            userNo:obj.UserNo,
            status:(!_status).toString()
        });
        answer.send({postString:_postString},function(response){
            if(!response.err){
                obj.Auditing = !_status;
            }
        })
    }

    $scope.resetMac=function(obj){
        var userNo = obj.UserNo;
        var _postString = createPostString("resetSubMac",{
            userNo:userNo,
            userMac:obj.MacNO
        });
        answer.send({postString:_postString},function(response){
            alert(response.msg);
        })
    }

    $scope.update=function(obj){
        var opt={
            templateUrl: 'mySubUserModalContent.html',
            controller: ModalInstanceCtrl,
            //size: size||,
            resolve: {
                questionType: function () {
                    return obj;
                },
                r_flag:function(){
                    return true;
                }
            }
        };

        var modalInstance = $modal.open(opt);

        modalInstance.result.then(function (result) {
            var postString = createPostString("updateSubUserInfo");
            answer.send({postString:postString,user:result},function(_result){
                if(_result.err){
                    alert(_result.msg);
                }
            });
        }, function () {
            //$log.info('Modal dismissed at: ' + new Date());
        });
    }

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getSubUserList",newSearcher);
        answer.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.records.forEach(function(item){
                switch(item.UserType.toString())
                {
                    case "1":
                        item.UserType =  "答题者";
                        break;
                    case "2":
                        item.UserType =  "问题者";
                        break;
                    case "3":
                        item.UserType =  "问题者子账号";
                        break;
                    case "4":
                        item.UserType =  "管理者";
                        break;
                }
            })
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);

}]);

appControllers.controller("subAbnormalCtrl",["$scope","answer",function($scope,answer){
    $scope.isShow = isShow();

    $scope.searcher = {};
    $scope.records  =[];

    //var pageS = 5;
    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getSubProblemQuestion",newSearcher);
        answer.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };

    $scope.search=function(){
        initPage();
        $scope.pageTo(1)
    };

    $scope.pageTo(1);

}]);

appControllers.controller("adminCtrl", ["$scope","admin", function ($scope,admin) {
    var userRegist = {
        type_1:5432,
        type_2: 11232,
        type_3:432,
        type_4:15432
    };
    var userOnline = {
        type1: 65,
        type2: 765,
        type3: 453,
        type4: 87
    };
    var md5Stats = {
        size:1854575,
        answerCount:65476,
        answerCredit: 576764,
        timeOutCount:29,
        errorCount:43
    };
    var imageStats = {
        size: 784567,
        capacity:12.43,
        index: "ImageMd5"
    };
    var runStats = {
        count:98545,
        list:127,
        answering:23,
        timeOutCount:531,
        errorCount:32,
        otherError:44,
        mamoryUsage:"1241141"
    };


    _userRegistRefresh();
    $scope.userRegistRefresh = function(){
        _userRegistRefresh();
    }
    function _userRegistRefresh(){
        var postString = createPostString("GetRegistStatisticsInfo");
        admin.send({postString:postString},function(result){
            $scope.userRegist = result;
        });
    }

//    _userOnlineRefresh();
    $scope.userOnlineRefresh = function(){
        _userOnlineRefresh();
    }
    function _userOnlineRefresh(){
        var postString = createPostString("GetUserOnlineInfo");
        admin.send({postString:postString},function(result){
            console.dir(result);
        });
    }

    _md5StatsRefresh();
    $scope.md5StatsRefresh = function(){
        _md5StatsRefresh();
    }
    function _md5StatsRefresh(){
        var postString = createPostString("GetMd5ImageState");
        admin.send({postString:postString},function(result){
            $scope.md5Stats = result;
        });
    }

    _imageStatsRefresh();
    $scope.imageStatsRefresh = function(){
        _imageStatsRefresh();
    }
    function _imageStatsRefresh(){
        var postString = createPostString("GetImageCollectionState");
        admin.send({postString:postString},function(result){
            var obj={
                files:Object.keys(result.index.files).join("::"),
                chunks:Object.keys(result.index.chunks).join("::")
            };
            $scope.imageStats = angular.extend(result,obj);
        });
    }

    _runStatsRefresh();
    $scope.runStatsRefresh = function(){
        _runStatsRefresh();
    }
    function _runStatsRefresh(){
        var postString = createPostString("GetRunStats");
        admin.send({postString:postString},function(result){
            $scope.runStats = result;
        });
    }

    $scope.userOnline = userOnline;
} ]);

appControllers.controller("questionTypeCtrl", ["$scope","$modal","$log","admin",function ($scope,$modal,$log,admin) {
    $scope.records=[];

    $scope.modify=function(id){
        var opt={
            templateUrl: 'myModalContent.html',
            controller: ModalInstanceCtrl,
            //size: size||,
            resolve: {
                questionType: function () {
                    return $scope.records.filter(function(obj){
                        return obj.gItemNo==id;
                    })[0]||{};
                },
                r_flag:function(){
                    return true;
                }
            }
        };

        var modalInstance = $modal.open(opt);

        modalInstance.result.then(function (result) {
            result.UserItemList.forEach(function(item){
                item.Discount = parseFloat(item.Discount)||0;
                item.Credits = parseInt(item.Credits)||0;
                item.TimeOut = parseInt(item.TimeOut)||0;
            });
            var postString = createPostString("updateQuestionType");
            admin.send({postString:postString,model:result},function(_result){
                //console.dir(_result);
            });
        }, function () {
            $log.info('Modal dismissed at: ' + new Date());
        });
    }

    $scope.remove=function(id){
        if(confirm("确定删除"+id+"记录")){
           var postString = createPostString("removeQuestionType;",{gItemNo:id})
            admin.send({postString:postString},function(result){
                if(result.err){
                    alert(result.msg);
                }else{
                    alert("删除成功");
                    $scope.pageTo(1);
                }
            });
        }
    }

    $scope.appendNew=function(){
        var opt={
            templateUrl: 'myModalContent.html',
            controller: ModalInstanceCtrl,
            //size: size||,
            resolve: {
                questionType: function () {
                    return getGameItem();
                },
                r_flag:function(){
                    return false;
                }
            }
        };
        var modalInstance = $modal.open(opt);

        modalInstance.result.then(function(result){
            var postString = createPostString("updateQuestionType");
            admin.send({postString:postString,model:result,isAdd:true},function(_result){
                if(_result.err){
                    alert(_result.msg);
                }else{
                    alert("添加成功")
                    $scope.pageTo(1);
                }
            });
        },function(){
            $log.info('Modal dismissed at: ' + new Date());
        });
    }

    //var pageS = 5;
    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = {pageSize:10,pageIndex:pageNum||1};
        var postString = createPostString("getQuestionTypeList",newSearcher);
        admin.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };

    $scope.pageTo(1);
} ]);

appControllers.controller("userCtrl",["$scope","admin","$modal",function($scope,admin,$modal){
    $scope.records=[];
    $scope.recordSize=0;
    $scope.searcher = {};

    $scope.search=function(){
        initPage();
        $scope.pageTo(1)
    };

    $scope.disable=function(obj){
        var _status = obj.Auditing;
        var _postString = createPostString("disabledUser",{
            userNo:obj.UserNo,
            status:(!_status).toString()
        });
        admin.send({postString:_postString},function(response){
            if(!response.err){
                obj.Auditing = !_status;
            }
        })
    }

    $scope.resetMac=function(obj){
        var userNo = obj.UserNo;
        var _postString = createPostString("resetMac",{
            userNo:userNo,
            userMac:obj.MacNO
        });
        admin.send({postString:_postString},function(response){
            alert(response.msg);
        })
    }

    $scope.update=function(obj){
        var opt={
            templateUrl: 'myUserModalContent.html',
            controller: ModalInstanceCtrl,
            //size: size||,
            resolve: {
                questionType: function () {
                    return obj;
                },
                r_flag:function(){
                    return true;
                }
            }
        };

        var modalInstance = $modal.open(opt);

        modalInstance.result.then(function (result) {
            var postString = createPostString("updateUserInfo");
            admin.send({postString:postString,user:result},function(_result){
                if(_result.err){
                    alert(_result.msg);
                }
            });
        }, function () {
            //$log.info('Modal dismissed at: ' + new Date());
        });
    }

    //var pageS = 5;
    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getUserList",newSearcher);
        admin.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.records.forEach(function(item){
                switch(item.UserType.toString())
                {
                    case "1":
                        item.UserType =  "答题者";
                        break;
                    case "2":
                        item.UserType =  "问题者";
                        break;
                    case "3":
                        item.UserType =  "问题者子账号";
                        break;
                    case "4":
                        item.UserType =  "管理者";
                        break;
                }
            })
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);
}])

appControllers.controller("rebateCtrl", ["$scope","admin", function ($scope,admin) {
    $scope.records=[];
    $scope.searcher = {};

    $scope.search=function(){
        if($scope.searcher.dateTimeFrom){
            var tempDateTime = new Date($scope.searcher.dateTimeFrom).getTime();
            $scope.searcher.dateTimeFrom = tempDateTime;
        }
        if($scope.searcher.dateTimeTo){
            var tempDateTo = new Date($scope.searcher.tempDateTo).getTime();
            $scope.searcher.dateTimeFrom = tempDateTo;
        }
        initPage();
        $scope.pageTo(1)
    };

    //var pageS = 5;
    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getRebateList",newSearcher);
        admin.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);
} ]);

appControllers.controller("abnormalCtrl", ["$scope","admin", function ($scope,admin) {

    $scope.searcher = {};
    $scope.records  =[];

    //var pageS = 5;
    var pageSize = 10;
    var groupSize = 5;

    $scope.getStatus=getQestionStatusDesc;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getProblemQuestion",newSearcher);
        admin.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };

    $scope.search=function(){
        initPage();
        $scope.pageTo(1)
    };

    $scope.pageTo(1);

} ]);

appControllers.controller("subQuestionUserCtrl",["$scope","$modal","question",function($scope,$modal,question){
    $scope.records=[];
    $scope.recordSize=0;
    $scope.searcher = {};

    $scope.show = isShow();

    $scope.getCreditBack=function(record){
        if(!record.QuestionCredits) return;
        var postString = createPostString("getCreditBack",{subUserNo:record.UserNo});
        question.send({postString:postString},function(result){
            if(result.err){
                alert(result.msg);
            }else{
                record.QuestionCredits=0;
                alert(result.msg);
            }
        });
    }

    $scope.update=function(obj){
        obj.EndDateTime = new Date(obj.EndDate).toJSON().split("T")[0];
        var opt={
            templateUrl: 'mySubUserModalContent.html',
            controller: ModalInstanceCtrl,
            //size: size||,
            resolve: {
                questionType: function () {
                    return obj;
                },
                r_flag:function(){
                    return true;
                }
            }
        };

        var modalInstance = $modal.open(opt);

        modalInstance.result.then(function (result){
            var endDate = result.EndDate;
            try{
                result.EndDate = new Date(result.EndDateTime).getTime();
            }catch(err){
                result.EndDate = endDate;
            }
            var postString = createPostString("updateSubUserInfo");
            question.send({postString:postString,user:result},function(_result){
                    alert(_result.msg);
            });
        }, function () {
            //$log.info('Modal dismissed at: ' + new Date());
        });
    }

    $scope.search=function(){
        initPage();
        $scope.pageTo(1)
    };

    $scope.disable=function(obj){
        var _status = obj.Auditing;
        var _postString = createPostString("disabledSubUser",{
            userNo:obj.UserNo,
            status:(!_status).toString()
        });
        question.send({postString:_postString},function(response){
            if(!response.err){
                obj.Auditing = !_status;
            }
        })
    }

    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getSubUserList",newSearcher);
        question.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);
}]);

appControllers.controller("subRechargeCtrl",["$scope","question",function($scope,question){
    $scope.show = isShow();

    $scope.records=[];
    $scope.searcher = {};

    $scope.cardPrice="";

    $scope.generateCard = function(){
        if($scope.cardPrice&&$scope.cardAmount){
            var sum = parseInt($scope.cardPrice)*parseInt($scope.cardAmount)*1000;
            if(sum>$scope.questionCredits){
                return alert("您目前的积分不足以生成总积分为"+sum+"的充值卡");
            }else{
                var postString = createPostString("generateCard",{
                    cardAmount:$scope.cardAmount,
                    cardPrice:$scope.cardPrice
                })
                question.send({postString:postString},function(result){
                    alert(result.msg);
                    if(!result.err){
                        $scope.pageTo(1);
                    }
                });
            }
        }
    }

    $scope.search=function(){
        initPage();
        $scope.pageTo(1)
    };

    $scope.cardAmount = 1;

    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getOrderList",newSearcher);
        question.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            $scope.questionCredits = response.Credits;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);

}]);

appControllers.controller("subRebateCtrl",["$scope","question",function($scope,question){
    $scope.show = isShow();

    $scope.records=[];
    $scope.searcher = {};

    $scope.userItemList=[];

    var postString=createPostString("getUserItemList");
    question.send({postString:postString},function(result){
        $scope.userItemList = result.list;
    });

    $scope.modify=function(userItem){
        userItem.TimeOut = parseInt(userItem.TimeOut)||0;
       var postString = createPostString("updateUserItem");
        question.send({postString:postString,UserItem:userItem},function(obj){
            alert(obj.msg);
        });
    }

    $scope.remove=function(userItem){
        var postString = createPostString("remUserItem",{
            gItemNo:userItem.gItemNo
        });
        question.send({postString:postString,UserItem:userItem},function(obj){
            alert(obj.msg);
            if(!obj.err){
                $scope.userItemList = $scope.userItemList.filter(function(item){
                    return item.gItemNo!=userItem.gItemNo
                })
            }
        });
    }

    $scope.search=function(){
        if($scope.searcher.dateTimeFrom){
            var tempDateTime = new Date($scope.searcher.dateTimeFrom).getTime();
            $scope.searcher.dateTimeFrom = tempDateTime;
        }
        if($scope.searcher.dateTimeTo){
            var tempDateTo = new Date($scope.searcher.tempDateTo).getTime();
            $scope.searcher.dateTimeFrom = tempDateTo;
        }
        initPage();
        $scope.pageTo(1)
    };

    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getRebateList",newSearcher);
        question.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);
}]);

appControllers.controller("chargeRecordCtrl",["$scope","question",function($scope,question){
    $scope.show = isShow();

    $scope.reCharge=function(){
        if(($scope.cardNo||"").length==32){
            var postString = createPostString("reCharge",{cardNo:$scope.cardNo});
            question.send({postString:postString},function(result){
                if(result.err){
                    alert(result.msg)
                }else{
                    alert(result.msg);
                    $scope.cardNo="";
                    $scope.pageTo(1);
                }
            });
        }
    }

    $scope.records=[];
    $scope.searcher = {};

    $scope.search=function(){
        initPage();
        $scope.pageTo(1)
    };

    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1,isSelf:"true"})
        var postString = createPostString("getOrderList",newSearcher);
        question.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);
}]);

appControllers.controller("recentQuestionCtrl",["$scope","question",function($scope,question){
    $scope.show = isShow();
    $scope.getStatuDesc = getQestionStatusDesc;
    $scope.records=[];
    $scope.searcher = {};

    $scope.search=function(){
        initPage();
        $scope.pageTo(1)
    };

    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getQuestionList",newSearcher);
        question.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);
}]);

appControllers.controller("historyRecordCtrl",["$scope","question",function($scope,question){
    $scope.synopsis={};
    $scope.show = isShow();
    var pageSize = 10;
    var groupSize = 5;
    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend({},{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getHistoryRecord",newSearcher);
        question.send({postString:postString},function(result){
            if(result.err){
                if(result.msg) {
                    alert(result.msg);
                }
                if(result.redirectTo){
                    window.location = result.redirectTo;
                }
            }else{
                $scope.creditRecords = result.result||[];
                $scope.recordSize = result.size;
                loadPage($scope.recordSize,pageNum)
                angular.forEach($scope.creditRecords,function(record){
                    record.sumCredit = record.QuestionCredits-record.ReportErrorCredits-record.TimeOutCredits;
                    //record.payAmount = parseFloat((record.sumCredit/2000).toFixed(2));
                    $scope.synopsis.sumQuestionCount = ($scope.synopsis.sumQuestionCount||0) + record.QuestionCount;
                    $scope.synopsis.sumQuestionCredits = ($scope.synopsis.sumQuestionCredits||0) + record.QuestionCredits;
                    $scope.synopsis.sumTimeOutCount = ($scope.synopsis.sumTimeOutCount||0) + record.TimeOutCount;
                    $scope.synopsis.sumTimeOutCredits = ($scope.synopsis.sumTimeOutCredits||0) + record.TimeOutCredits;
                    $scope.synopsis.sumReportErrorCount = ($scope.synopsis.sumReportErrorCount||0) + record.ReportErrorCount;
                    $scope.synopsis.sumReportErrorCredits = ($scope.synopsis.sumReportErrorCredits||0) + record.ReportErrorCredits;
                    $scope.synopsis.sumNotSureCount = ($scope.synopsis.sumNotSureCount||0) + record.NotSureCount;
                    $scope.synopsis.sumCredit = ($scope.synopsis.sumCredit||0) + record.sumCredit;
                    //$scope.synopsis.payAmount =  (parseFloat(($scope.synopsis.payAmount||0)) + record.payAmount).toFixed(2);
                })
            }
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };

    $scope.pageTo(1);
}]);

appControllers.controller("personProfileCtrl",["$scope","question",function($scope,question){
    $scope.show = isShow();
    var postString = createPostString("GetPersonProfiles");
    question.send({postString:postString},function(result){
        if(result.err){
            alert(result.msg);
            if(result.redirectTo){
                window.location = result.redirectTo;
                return;
            }
        }

        var user = result.result
        user.RegTime = new Date(user.RegTime).toLocaleString();
        $scope.user =user;
    });
    $scope.isShow = isShow();
    $scope.update = function(flag){
        var opt = {};
        if(flag){
            opt.UserName = $scope.user.UserName;
            opt.UserQQ = $scope.user.UserQQ;
            opt.UserEmail = $scope.user.UserEmail;
            if(!opt.UserName&&!opt.UserQQ&&!opt.UserEmail) return;
        }else{
            opt.prePwd = $scope.prePwd;
            opt.updPwd1 = $scope.updPwd1;
            opt.updPwd2 = $scope.updPwd2;
            if(opt.updPwd1!=opt.updPwd2){
                return alert("密码不一致")
            }
            if(!opt.prePwd||!opt.updPwd1) return;
        }
        var postString = createPostString("UpdatePersonProfiles",opt);
        question.send({postString:postString},function(result){
            if(result.msg){
                return alert(result.msg)
            }
        });
    }
}]);

appControllers.controller("otherCtrl",["$scope","admin",function($scope,admin){
    $scope.CardNo="";
    $scope.generateCard = function(){
        var postString = createPostString("generateCard",{price:$scope.cardPrice});
        admin.send({postString:postString},function(result){
            if(result.err){
                alert(result.msg);
            }else{
                $scope.CardNo = result.result;
            }
        });
    }

    $scope.reCharge=function(){
        if($scope.userNo&&$scope.cardNo){
            var postString = createPostString("reCharge",{userNo:$scope.userNo,cardNo:$scope.cardNo});
            admin.send({postString:postString},function(result){
                if(result.err){
                    alert(result.msg);
                }else{
                    alert("充值成功");
                    //$scope.userNo="";
                   // $scope.cardNo="";
                }
            });
        }
    }

    $scope.remove = function(id){
        if(!confirm("确定要删除?")) return;
        var postString = createPostString("removeCard",{CardId:id});
        admin.send({postString:postString},function(result){
            if(result.err){
                alert("删除失败");
            }else{
                $scope.records = $scope.records.filter(function(obj){
                    return obj._id!=id;
                })
            }
        });
    }

    $scope.records=[];
    $scope.searcher = {};

    $scope.search=function(){
        initPage();
        $scope.pageTo(1)
    };

    var pageSize = 10;
    var groupSize = 5;

    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getCardList",newSearcher);
        admin.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);
}]);

appControllers.controller("admindepositCtrl",["$scope","admin",function($scope,admin){
    $scope.records=[];

    var pageSize = 10;
    var groupSize = 5;

    $scope.deposit=function(record){
        if(confirm("是否确定处理?")){
            var postString = createPostString("deposit",{
                userNo:record.UserNo,
                creditNo:record.CreditNo
            })
            admin.send({postString:postString},function(result){
                if(!result.err){
                    record.IsFinish = true;
                }else{
                    alert(result.msg);
                }
            });
        }
    }

    $scope.searcher={};
    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getDepositStatus",newSearcher);
        admin.send({postString:postString},function(response){
            $scope.records = response.result;
            $scope.recordSize = response.size;
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);

}]);

appControllers.controller("depositCtrl",["$scope","answer",function($scope,answer){
    $scope.showFlag = false;
    $scope.records = [];
    $scope.showPanel = function(){
        $scope.showFlag = true;
    }

    $scope.deposit = function(){
        var cash = parseFloat($scope.cash)||0;
        if($scope.creditNo&&cash) {
            var postString = createPostString("deposit",{
                creditNo:$scope.creditNo,
                cash:cash,
                remark:$scope.remark
            });
            answer.send({postString: postString}, function (result) {
                if (!result.err) {
                    $scope.creditNo = "";
                    $scope.cash = "";
                    $scope.showFlag = false;
                    $scope.pageTo(1);
                }
            });
        }else{
            alert("请输入正确的提现码和提现金额");
            $scope.creditNo = "";
            $scope.cash = "";
        }
    }

    var pageSize = 10;
    var groupSize = 5;

    $scope.searcher={};
    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getDepositStatus",newSearcher);
        answer.send({postString:postString},function(response){
            if(response.err){
                $scope.records = [];
                $scope.recordSize = 0;
                $scope.credits = 0;
                //alert(response.msg);
            }else{
                $scope.records = response.result;
                $scope.recordSize = response.size;
                $scope.credits = response.credits;
            }
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);

}]);

appControllers.controller("qDepositCtrl",["$scope","question",function($scope,question){

    $scope.show = isShow();
    $scope.showFlag = false;
    $scope.records = [];
    $scope.showPanel = function(){
        $scope.showFlag = true;
    }

    $scope.deposit = function(){
        var cash = parseFloat($scope.cash)||0;
        if($scope.creditNo&&cash) {
            var postString = createPostString("deposit",{
                creditNo:$scope.creditNo,
                cash:cash,
                remark:$scope.remark
            });
            question.send({postString: postString}, function (result) {
                if (!result.err) {
                    $scope.creditNo = "";
                    $scope.cash = "";
                    $scope.showFlag = false;
                    $scope.pageTo(1);
                }else{
                    alert(result.msg);
                }
            });
        }else{
            alert("请输入正确的提现码和提现金额");
            $scope.creditNo = "";
            $scope.cash = "";
        }
    }

    var pageSize = 10;
    var groupSize = 5;

    $scope.searcher={};
    $scope.pageTo=function(pageNum){
        if(pageNum==0||pageNum==-1){
            if(pageNum==0) {
                $scope.curGroupIndex++;
                pageNum =  $scope.curGroupIndex*groupSize+1;
            }
            if(pageNum==-1){
                pageNum =  $scope.curGroupIndex*groupSize;
                $scope.curGroupIndex--;
            }
        }
        var newSearcher = angular.extend($scope.searcher,{pageSize:10,pageIndex:pageNum||1})
        var postString = createPostString("getDepositStatus",newSearcher);
        question.send({postString:postString},function(response){
            if(response.err){
                $scope.records = [];
                $scope.recordSize = 0;
                $scope.credits = 0;
                //alert(response.msg);
            }else{
                $scope.records = response.result;
                $scope.recordSize = response.size;
                $scope.credits = response.credits;
            }
            loadPage($scope.recordSize,pageNum)
        })
    }

    $scope.curGroupIndex = 0;

    function loadPage(size,curIndex){
        var groupCount = Math.ceil(size/pageSize);
        var left = size%pageSize;
        if(groupCount<=5){
            $scope.page.pre = false;
            $scope.page.nex = false;
        }else{
            $scope.page.pre = true;
            $scope.page.nex = true;
        }
        if(Math.floor(groupCount/groupSize)>=$scope.curGroupIndex
            &&Math.ceil(groupCount/groupSize)<=($scope.curGroupIndex+1)
            ){
            $scope.page.nex = false;
        }
        if(curIndex<=5){
            $scope.page.pre = false;
        }
        $scope.page.one=$scope.curGroupIndex*groupSize+1;
        $scope.page.two=$scope.curGroupIndex*groupSize+2;
        $scope.page.thr=$scope.curGroupIndex*groupSize+3;
        $scope.page.fou=$scope.curGroupIndex*groupSize+4;
        $scope.page.fiv=$scope.curGroupIndex*groupSize+5;
        if((groupCount-($scope.curGroupIndex+1)*groupSize)<=0){
            //alert(curIndex%groupSize)
            if ($scope.page.one>groupCount){
                $scope.page.one=false;
            }
            if ($scope.page.two>groupCount){
                $scope.page.two=false;
            }
            if ($scope.page.thr>groupCount){
                $scope.page.thr=false;
            }
            if ($scope.page.fou>groupCount){
                $scope.page.fou=false;
            }
            if ($scope.page.fiv>groupCount){
                $scope.page.fiv=false;
            }
        }
        var num = curIndex - ($scope.curGroupIndex)*groupSize;
        $scope.page.oneS=false;
        $scope.page.twoS=false;
        $scope.page.thrS=false;
        $scope.page.fouS=false;
        $scope.page.fivS=false;
        if(num==1) $scope.page.oneS=true;
        if(num==2) $scope.page.twoS=true;
        if(num==3) $scope.page.thrS=true;
        if(num==4) $scope.page.fouS=true;
        if(num==5) $scope.page.fivS=true;
    }

    function initPage(){
        $scope.page={
            pre:false,
            one:1,
            two:2,
            thr:3,
            fou:4,
            fiv:5,
            nex:true
        };
        $scope.curGroupIndex=0;
    }

    $scope.page={
        pre:false,
        one:1,
        two:2,
        thr:3,
        fou:4,
        fiv:5,
        nex:true
    };
    $scope.pageTo(1);
}]);

function createPostString(instruction,keyvalueObj){
    if(instruction){
        var result = instruction+";";
        keyvalueObj = keyvalueObj||{};
        var keys = Object.keys(keyvalueObj)
        keys.forEach(function(key){
            if(keyvalueObj[key]){
                result+=key+"="+keyvalueObj[key]+";";
            }
        })
        return result;
    }
    return "";
}

function getGameItem(){
    var obj={
        "gItemNo" : 0,
        "TakeCredits" : 0,
        "Remark" : "",
        "TakeCredits1" : 0,
        "TakeCredits2" : 0,
        "TakeCredits3" : 0,
        "AnswerCredits1" : 0,
        "AnswerCredits2" : 0,
        "AnswerCredits3" : 0,
        "gItemName" : "",
        "gItemType" : "",
        "TimeOut" : 0,
        "gAnswerLen" : 0,
        "UserNo" : "system",
        "AnswerIn" : "",
        "AnswerNotIn" : "",
        "CheckStr" : "",
        "RegExp":"",
        "Script":""
    };
    return obj;
}

function getQestionStatusDesc(status){
    var desc = "";
    switch (status.toString())
    {
        case "1":
            desc = "已回答";
            break;
        case "0":
            desc="等待回答";
            break;
        case "-1":
            desc="图片有错";
            break;
        case "-2":
            desc="回答超时";
            break;
        case "-3":
            desc="未知错误";
            break;
        case "-4":
            desc="正在回答";
            break;
    }
    return desc;
}

function isShow(){
    return sessionStorage.getItem("show")=="true";
}

/**
 * 生成一个GUID
 */
function guid(format) {
    var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    var temp = (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    if(format==undefined ){
        return  temp;
    } else{
        switch(format.toLowerCase())
        {
            case "b":
                return Format("{0}{1}{2}","{",temp,"}");
                break;
            case "p":
                return Format("{0}{1}{2}","(",temp,")");
                break;
            case "n":
                return temp.replace(/-/g,"");
                break;
            case "d":
            default :
                return temp;
                break;
        }
    }
};

function initList($sc){
    var postString = createPostString("getQuestionTypeList");
    admin.send({postString:postString},function(result){
        $sc.records = result;
    });
}