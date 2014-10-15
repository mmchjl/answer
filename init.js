/**
 * Created with JetBrains WebStorm.
 * User: LE
 * Date: 13-5-15
 * Time: 下午10:00
 * To change this template use File | Settings | File Templates.
 */

//(function(){
var config = require("./config.js").config,
    util =require("util"),
    fs = require("fs"),
    http = require("http"),
    crypto = require("crypto");
/**
 * 对象验证
 * 根据对象的属性来将字符串转化成相应的数据类型
 */
 function objectValid (orgObj){
    var obj = {};
    for(var pro in orgObj){
        var type = pro.split("_")[1];
        if(typeof type==="undefined"){
            obj[pro] = orgObj[pro];
            continue;
        }
        switch(type){
            case "txt":
            case "str":
                //当字符变量的时候
                obj[pro] = orgObj[pro];
                break;
            case "bool":
                //当为boolean变量的时候
                var _val = orgObj[pro];
                if(_val==1||_val.toLowerCase()=="true"){
                    obj[pro] = true;
                }else{
                    obj[pro] = false;
                }
                break;
            case "int":
                //当为整形变量的时候
                obj[pro] =parseInt(orgObj[pro]);
                break;
            case "long":
                //当为c长整整
                obj[pro] =parseInt(orgObj[pro]);
                break;
            case "double":
                //浮点型变量
                obj[pro] =parseFloat(orgObj[pro]);
                break;
            case "date":
            case "time":
                //日期变量,要求格式为yyyy/MM/dd hh:mm
                if(!isNaN(orgObj[pro])){
                    obj[pro] = parseInt(orgObj[pro]);
                }else{
                    obj[pro] =Date.parse(orgObj[pro]);
                }
                break;
            default :
                obj[pro] = orgObj[pro];
                break;
        }
    }
    return obj;
}

/**
 * 判断一个对象是否为undefined
 * 返回bool结果
 * */
function isUndefined (obj) {
    return typeof (obj) == "undefined";
};

/**
 * 生成一个GUID
 */
function Guid(format) {
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

/**
 *判断一个对象是否为Null
 * 返回bool结果
 **/
function isNull(obj) {
    return typeof (obj) == "undefined" || obj == null;
}

/** 通用函数
 * 格式化如string.Format("{0}/{1}","1989","9")="1989/9"
 * */
function Format() {
    if (!arguments[0]) {
        return "";
    }
    if (arguments.length == 1) {
        return arguments[0];
    }
    else if (arguments.length >= 2) {
        for (var i = 1; i < arguments.length; i++) {
            arguments[0] = arguments[0].replace(new RegExp("\\{" + (i - 1) + "\\}", "gm"), arguments[i]);
        }
        return arguments[0].replace(new RegExp("\\{", "gm"), "{").replace(new RegExp("\\}", "gm"), "}");
    }
}

function handleException(err){
    try{
       debug(err);
       outErr(err);
    }catch(e){
       util.debug("HandleException异常："+err.message?err.message:"NULL");
    }
};

function debug(message){
    if(config.runtime.isDebug){
        if(typeof(message)=="string"){
            util.debug(message);
        }else{
            util.debug(util.inspect(message));
        }
    }
}

function outErr(err){
    if(config.runtime.isLog){
        var date = new Date();
        var path =Format("./logfile/exception/{0}.log",date.format("yyyy-MM-dd"));
        var message = Format("Time:{0}\r\n{1}\r\n\r\n",date.format("yyyy-MM-dd hh:mm:ss"),err.stack);
        writeLog(path,message)
    }

}

function writeLog(path,msg){
    fs.appendFile(path,msg,"utf8",function(err){
        if(err){
            throw err;
        }
    })
}

function Md5(string,algorithm,outputEncoding){
    var _algorithm = algorithm||"MD5";
    var _outputEncoding = outputEncoding||"base64";
    var hash = crypto.createHash(_algorithm);
    hash.update(string);
    return hash.digest("base64");
}


/**
 * 日期
 * 时间对象的格式化:
 * 如将date对象转化成yyyy-MM-dd hh:mm
 */
Date.prototype.format = function(format) {
    /*
     * eg:format="YYYY-MM-dd hh:mm:ss";
     */
    var o = {
        "M+" :this.getMonth() + 1, // month
        "d+" :this.getDate(), // day
        "h+" :this.getHours(), // hour
        "m+" :this.getMinutes(), // minute
        "s+" :this.getSeconds(), // second
        "q+" :Math.floor((this.getMonth() + 3) / 3), // quarter
        "S" :this.getMilliseconds()
        // millisecond
    }

    if (/(y+)/.test(format)) {
        format = format.replace(RegExp.$1, (this.getFullYear() + "")
            .substr(4 - RegExp.$1.length));
    }

    for ( var k in o) {
        if (new RegExp("(" + k + ")").test(format)) {
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k]
                : ("00" + o[k]).substr(("" + o[k]).length));
        }
    }
    return format;
}


/**
 *去除左右的空格
 * */
String.prototype.Trim = function() {
    return this.replace(/(^\s*)|(\s*$)/g, "");
};

/**
 * 去除左边的空格
 * */
String.prototype.LTrim = function() {
    return this.replace(/(^[\\s]*)/g, "");
};
/**
 * 去除右边的空格
 * */
String.prototype.RTrim = function() {
    return this.replace(/([\\s]*$)/g, "");
};
/**
 * 将html编码还原成字符串
 * */
String.prototype.HtmlDecode = function() {
    return this.replace.replace(/&quot;/g, '\"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
};
/**
 * 将字符串改成html编码
 * */
String.prototype.HtmlEncode = function() {
    return this.replace.replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};


/**
 * 转化类型
 * 返回转化后的对象数组
 * */
Array.prototype.ConvertAll = function(fun) {
    var r = [];
    for (var i = 0; i < this.length; i++) {
        r.push(fun(this[i]));
    }
    return r;
};
/**
 * 遍历数组寻找相应的元素
 * 返回符合条件的元素组成的数据
 * */
Array.prototype.FindAll = function(fun) {
    var r = [];
    for (var i = 0; i < this.length; i++) {
        if (fun(this[i])) r.push(this[i]);
    }
    return r;
};
/**
 * 遍历所有元素，找出符合条件的一个元素
 * 返回只符合条件的单个元素
 * */
Array.prototype.Find = function(fun) {
    for (var i = 0; i < this.length; i++) {
        if (fun(this[i])) return this[i];
    }
    return null;
};
/**
 * 遍历所有，判断是否存在符合条件的元素
 * 返回bool类型结果
 * */
Array.prototype.Exists = function(fun) {
    for (var i = 0; i < this.length; i++) {
        if (fun(this[i])) return true;
    }
    return false;

};
/**
 * 遍历所有元素，执行相应的方法
 * 相当于forEach
 * */
Array.prototype.Each = function(fun) {
    for (var i = 0; i < this.length; i++) {
        fun(this[i]);
    }
};


//Set-Cookie: userName=admin; expires=Thu, 26-Apr-2012 15:52:34 GMT; path=/
http.OutgoingMessage.prototype.setCookie =function(cookie){
    var _name = cookie.name||cookie.key,
        _value = cookie.value,
        _expires = cookie.expires,
        _secure = cookie.secure,
        _domain = cookie.domain,
        _path = cookie.path?cookie.path:"/";
    var header = "Set-Cookie";
    var value = "";
    if(_name&&_value) value+=utility.Format(" {0}={1}",_name,_value);
    if(_expires) value=utility.Format("{0}; {1}={2}",value,"expires",_expires.toGMTString());
    if(_domain) value = utility.Format("{0}; {1}={2}",value,"domain",_domain);
    if(_path) value=utility.Format("{0}; {1}={2}",value,"path",_path);
    if(_secure) value = utility.Format("{0};{1}",value,"secure");
    //if(_value) value+=_value;
    //没有生产_header才设置响应头
    if(!this._header){
        this.setHeader(header,value);
    }else{
        this.setHeaderItem({key:header,value:value});
    }
}

http.OutgoingMessage.prototype.removeCookie=function(name){
    var key = "Set-Cookie";
    var value = utility.Format("{0}={1};expires={2};path=/",name,"",(new Date(14626611963)).toGMTString());
    if(!this._header&&name){
       this.setHeader(key,value);
    }else{
       this.setHeaderItem({
           key:key,
           value:value
       });
    }
}

http.OutgoingMessage.prototype.setHeaderItem=function(){
    var obj = arguments[0];
    var _newLine = "\r\n";
    var _itemSeperator=": ";
    var _cookieHeader="Set-Cookie";
    if(obj&&obj.key&&obj.value){
        var _header = this._header;
        if(!_header){
            this.setHeader(obj.key,obj.value);
            return;
        }
        var _headerArr = _header.split(_newLine);
        var _newHeader = [];
        var _firstLine = _headerArr[0];
        var _headerObjArr = [];
        _headerArr.forEach(function(obj){
            if(obj.indexOf(_itemSeperator)!=-1){
                _headerObjArr.push({
                    key:obj.split(_itemSeperator)[0],
                    value:obj.split(_itemSeperator)[1]
                });
            }
        })
        var isExists = _headerObjArr.Exists(function(item){return item.key==obj.key});
        if(obj.key!=_cookieHeader&&isExists){
            _headerObjArr.Find(function(item){return item.key==obj.key;}).value=obj.value;
        }else{
            _headerObjArr.push({
                key:obj.key,
                value:obj.value
            });
        }
        _newHeader.push(_firstLine);
        _headerObjArr.forEach(function(item){
            var line = Format("{0}{1}{2}",item.key,_itemSeperator,item.value);
            _newHeader.push(line);
        });
        var _result = _newHeader.join(_newLine)+_newLine+_newLine;
        this._header = _result;
        //console.log(_result);
        //console.log("=========================================");
    }
}

function Md5(str,ali,outputFormat){
    var _ali = ali||"md5";
    var _outputForamt = outputFormat||"hex";
     var hash = crypto.createHash(_ali);
    hash.update(str);
    return hash.digest(_outputForamt);
}

http.OutgoingMessage.prototype.writeJson = function(){
    var temp = arguments[0];
    if(typeof temp=="string") this.wirte(temp);
    if(typeof temp =="object") this.write(JSON.stringify(temp));
}

http.OutgoingMessage.prototype.endJson=function(){
    var temp = arguments[0];
    if(utility.isNull(temp)) this.end();
    if(typeof temp=="string") this.end(temp);
    if(typeof temp=="object") this.end(JSON.stringify(temp));
    this.end();
};

Function.prototype.isAuth = true;

function extend(template,target){
    if(template){
        if(target){
            var result = {};
            for(var i in template){
                result[i]=template[i];

            }
            return result;
        }
        return template;
    }
    return {};
}

global.configuration = {
    scheduleTask:[],
    config:config
};

global.utility = {
    objectValid:objectValid,
    isUndefined:isUndefined,
    Guid:Guid,
    isNull:isNull,
    isUndefined:isUndefined,
    Format:Format,
    debug:debug,
    outerErr:outErr,
    handleException:handleException,
    extend:extend,
    MD5:Md5
}
