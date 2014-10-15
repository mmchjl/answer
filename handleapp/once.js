/**
 * Created with JetBrains WebStorm.
 * User: NL_LE
 * Date: 13-7-26
 * Time: 上午11:18
 * To change this template use File | Settings | File Templates.
 */

var mongo  = require("../lib/mongoClient.js"),
    handleBase = require("./../lib/handleAppBase.js").handleBase,
    once = require("./../lib/once.js").once,
    answer = require("./../lib/answer.js").answer,
    admin = require("./../lib/admin.js").admin,
    quester = require("./../lib/quester.js").quester,
    common = require("./../lib/unAuthInterface.js").common;

function handle(header,response){
    app.handle(header,response)
}

var _handler = {
    main:function(header,response){
        var postString = header.get("postString");
        var postSource = header.get("postSource");
        if(postString&&postSource=="Once.dll"){
            once(postString,header,response);
        }else if(postString&&postSource=="answer"){
            answer(postString,header,response);
        }else if(postString&&postSource=="admin"){
            admin(postString,header,response);
        }else if(postString&&postSource=="question"){
            quester(postString,header,response);
        }else if(postString&&postSource=="common"){
            common(postString,header,response);
        }else{
            response.end("#Error=BackRequest");
        }
    }
};

var app = new handleBase("article",_handler);
app.isAuthorization = false;

module.exports.handle = handle;