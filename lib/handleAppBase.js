/**
 * Created with JetBrains WebStorm.
 * User: NL_LE
 * Date: 13-8-5
 * Time: 下午2:55
 * handleApp处理类的基类，统一了写响应头的handle方法，根据每个继承类的各自_handler方法调用不同的方法
 */

//var user = require("./bll/user.js");
//var permission = require("./bll/permission.js");

/**
 * collection:对应数据库的集合名称(string)
 * hander:子类重写的处理对象(object)
 */
function handleBase(collection, handler) {
    this.opt = {};
    this.opt.collection = collection || "";
    this._handler = handler || {};
    this.isAuthorization = true;
}

var cache = {};

function authorzation(header, cb) {
    var handler = header.handler,
        action = header.action;
    var uniqCode = utility.Format("{0}.{1}", handler, action);
    var pCode = cache[uniqCode];
    if (pCode) {
        //存在
        user.checkPower(header, pCode, cb)
    } else {
        //不存在
        permission.getPCodeByHanderAndAction(handler, action, function (code) {
            cache[uniqCode] = code;
            user.checkPower(header, code, cb);
        });
    };
}


handleBase.prototype.handle = function (header, response) {
    response.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });
    var action = header.action.toLowerCase();
    if (this._handler[action] != undefined) {
        if (!this.isAuthorization) {
            var auth = utility.Format("{0}.isAuth", action);
            if (this._handler[auth]) {
                if (header.auth) {
                    //登录后，需要检查权限
                    return this._handler[action](header, response);
                    authorzation(header, function (r) {
                        if (r) {
                            //有权限请求
                            return this._handler[action](header, response);
                        } else {
                            //无权限请求
                            return response.endJson({ result: false, code: 403 });
                        }
                    })
                } else {
                    //未登录
                    return response.endJson({ result: false, code: 100 });
                }
            } else {
                //不需要检查权限
                return this._handler[action](header, response);
            }
        } else {
            if (this.isAuthorization && header.auth) {
                return this._handler[action](header, response);
            } else {
                return response.endJson({ result: false, code: 100 });
            }
        }
    } else {
        return response.end();
    }
};

module.exports.handleBase = handleBase;