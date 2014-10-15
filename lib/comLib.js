/**
 * Created by Administrator on 2014/7/3.
 */

var dal = require("./dataAdapter.js");


var comLib={
    getQueryString:function(source,name){
        var arrSource = source.split(";");
        var arrOjbect={};
        arrSource.forEach(function(obj){
            var _arr = obj.split("=");
            if(_arr.length==2){
                arrOjbect[_arr[0]] = _arr[1];
            }
        })
        return (arrOjbect[name]||"").trim();
    },
    err:function(code){
        if(code){
            return "#Error="+code.toString();
        }
        return "#Error=unkwon";
    },
    generateQuestionNo:function(){
        return "A"+(new Date()).getTime().toString().substring(5)+Math.floor(Math.random()*1000);
    },
    createQuestion:function(){
        var obj = {
            "RegExp" : "",
            "gItemNo" : "",
            "gItemType" : "",
            "Script" : "",
            "QuesterId" : "",
            "QuestionNO" : "",
            "QuestionDate" : 0,
            "sAnswer" : "",
            "AnswererId" : "",
            "AnswerDate" : "",
            "Remark" : "",
            "Status" : 0,
            "TakeCredits" : 0,
            "AnswerCredits" : 0,
            "ImageType" : "",
            "gItemTypeOwner":"",
            "MACNo" : "",
            "ImageMd5_32" : "",
            "RebateUserNo" : "",
            "dllId" : "",
            "AnswerList" : "",
            "TimeOut":0,
            "imgId":""
        };
        return obj;
    },
    createUser:function(){
        var obj = {
            "AnswerCredits" : 0,
            "Auditing" : true,
            "BeReplacedUserNo" : "",
            "BeginDate" : "",
            "EndDate" : 0,
            "MacNO" : "",
            "ParentUserNo" : "",
            "Password" : "",
            "QuestionCredits" : 0,
            "RegTime" : new Date().getTime(),
            "Remark" : "",
            "UserEmail" : "",
            "UserName" : "",
            "UserNo" : "",
            "UserQQ" : "",
            "UserType" : 1,
            "gItemTypeIn" : "",
            "isSubAdmin":false
        };
        return obj;
    },
    createUserTotal:function(){
        var obj = {
            "QuestionDate" : getToday().toString(),
            "UserNo" : "",
            "QuestionCount" : 0,
            "QuestionCredits" : 0,
            "TimeOutCount" : 0,
            "TimeOutCredits" : 0,
            "ReportErrorCount" : 0,
            "ReportErrorCredits" : 0,
            "Remark" : "",
            "NotSureCount" : 0,
            "NotSureCredits" : 0,
            "AQtyTimeA" : 0,
            "AQtyTimeB" : 0,
            "AQtyTimeC" : 0,
            "AQtyTimeD" : 0,
            "AQtyTimeE" : 0,
            "AQtyTimeF" : 0,
            "AutoId" : utility.Guid(),
            "TimeOutCount2" : 0,
            "TimeOutCredits2" : 0,
            "AQtyTime0" : 0,
            "AQtyTime1" : 0,
            "AQtyTime2" : 0,
            "AQtyTime3" : 0,
            "AQtyTime4" : 0,
            "AQtyTime5" : 0,
            "AQtyTime6" : 0,
            "AQtyTime7" : 0,
            "AQtyTime8" : 0,
            "AQtyTime9" : 0,
            "AQtyTime10" : 0,
            "AQtyTime11" : 0,
            "AQtyTime12" : 0,
            "AQtyTime13" : 0,
            "AQtyTime14" : 0,
            "AQtyTime15" : 0,
            "AQtyTime16" : 0,
            "AQtyTime17" : 0,
            "AQtyTime18" : 0,
            "AQtyTime19" : 0,
            "AQtyTime20" : 0,
            "AQtyTime21" : 0,
            "AQtyTime22" : 0,
            "AQtyTime23" : 0
        }
        return obj;
    },
    createImageMd5:function(){
        var obj = {
            "AutoId" : 0,
            "RecordId" : utility.Guid(),
            "gItemNo" : 0,
            "ImageMd5" : "",
            "sAnswer" : "",
            "LastUseTime" : (new Date()).getTime(),
            "BuildTime" : (new Date()).getTime()
        }
        return obj;
    },
    createGameItem:function(){
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
            "UserNo" : "",
            "AnswerIn" : "",
            "AnswerNotIn" : "",
            "CheckStr" : "",
            "RegExp":"",
            "Script":""
        };
        return obj;
    },
    createCard:function(){
        var guid = utility.Guid("n").toUpperCase();
        var obj={
            "CardNo" : guid,
            "CardPrice" : 0,
            "CardFen" : 0,
            "Auditing" : false,
            "CardTime" : 0,
            "CardUser" : "",
            "AddTime" : new Date().getTime(),
            "UserName" : "",
            "UserType" : 0,
            "Alipay" : "Ansay",
            "Balance" : 0,
            "Id" : 0
        }
        return obj;
    },
    createOrder:function(){
        var obj={
            "ParentUserNo" : "",
            "UserNo" : "",
            "BuyNum" :1,
            "CardName" : "卡号充值",
            "CardPrice" : 0,
            "TotalPrice" : 0,
            "TiFen" : 0,
            "Auditing" : true,
            "Commend" : true,
            "BuyTime" : 0,
            "IsPay" : true,
            "buyer_email" : "",
            "trade_no" : "",
            "gmt_payment" :0,
            "Id" : 0,
            "Balance" : "",
            "CardNo":""
        };
        return obj;
    },
    createDepositRecord:function(){
        var obj={
            UserNo:"",
            Today:getToday().toString(),
            Cash:0,
            CreateTime:new Date().getTime(),
            CreditNo:"",
            IsFinish:false,
            AuditUserNo:"",
            Remark:""
        };
        return obj;
    },
    createUserItem:function(){
        var obj={
            UserNo:"",
            gItemNo:"",
            Discount:0,
            Credit:0,
            Remark:"",
            CreateTime:new Date().getTime()
        };
        return obj;
    },
    Status:{
        Answered:1,
        Waiting:0,
        Unknown:-1,
        TimeOut:-2,
        Error:-3,
        Answering:-4
    },
    today:getToday,
    userType:{
        Answer:1,
        Question:2,
        SubQuestionUser:3,
        Admin:4
    }
};

function getToday(){
    var date = new Date();
    var str = (date.getYear()+1900).toString()+"/"+(date.getMonth()+1).toString()+"/"+date.getDate().toString()
    return (new Date(str)).getTime();
}

module.exports.util = comLib;