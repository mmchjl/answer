var util = require("util");
var fs = require("fs");
var path = require("path");
var mongo = require("./lib/mongodb.js"),
    session = require("./lib/session.js");

var handlers = {};

(function(){
    var appPath = "./handleapp";
    var extname = ".js";
    fs.readdir(appPath,function(err,files){
        if(err){
            return utility.handleException(err);
        }
        files.forEach(function(file){
            var filename = path.basename(file);
            var modulename = path.basename(file,extname);
            var filepath = appPath+"/"+filename;
            handlers[modulename] = require(filepath);
        })
        //console.dir(handlers);
    })
})();

function handle(header,response){
	var handler = header.handler.toLowerCase();
	if(header.path=="/") {
            response.writeHead(302, {
            "Content-Type": "text/plain; charset=utf-8",
            "Location":"/index.html#/home"
        });
       return response.end();
	}
    if(handlers[handler]){
        handlers[handler].handle(header,response);
    }else{
        defaultHandler.handle(header,response);
    }
    //session.setSession(header.session);
    //是否开启统计
//    if(true){
//        var opt = {
//            collection:"static",
//            query:{
//                path:header.tempUrl.pathname
//            },
//            newObject:{
//                $set:{lastdate:(new Date()).getTime()},
//                $inc:{time:1}
//            }
//        };
//        mongo(function(err, db, release, genid){
//            if(err) {
//                console.log("计数err："+err.message);
//                release();
//            }
//            db.collection(opt.collection,function(err,col){
//                col.update(opt.query,opt.newObject ,{safe:false,upsert:true},function(err,data){
//                    if(err){
//                        console.log("计数2err："+err.message);
//                        release();
//                    }
//                    release();
//                })
//            });
//        })
//    }
}

var defaultHandler = {
	handle:function (header,response){
		var mine = header.extname;
		switch(mine)
		{
			case "css":
			case "js":
			case "jpg":
			case "bmp":
			case "doc":
			case "gif":
			case "htm":
			case "html":
			case "jpe":
			case "jpeg":
			case "txt":
			case "mp3":
			case "mp4":
			case "png":
            case "otf":
            case "eot":
            case "svg":
            case "ttf":
            case "woff":
            case "json":
			this.staticfile(header,response);
			break;
			default:
			this.badrequest(header,response);
			break;
		}
	},
	staticfile:function(header,response){
		var _path = "."+header.path;
		// console.log("request file path:"+_path);
		fs.stat(_path,function(err,state){
			if(state){
				fs.readFile(_path,function(err,file){
					if(err){
						response.writeHead(404,{
							"Content-Type":" text/plain"
						});
						response.end("file read err");
					}
					else{
                        var req_modify = header.headers['if-modified-since'];
                        var res_modify = state.mtime.toGMTString();
                        if(req_modify!=res_modify) {
                            response.writeHead(200,{
                                "Content-Type": defaultHandler.getmime(header.extname),
                                "Last-Modified" :res_modify
                            });
                            response.write(file);
                            //utility.debug(file);
                            response.end();
                        }else{
                            response.writeHead(304,{
                                "Content-Type": defaultHandler.getmime(header.extname),
                                "Last-Modified" :res_modify
                            });
                            //response.write(file);
                            response.end();
                        }
					}
				});
			}else{
				response.writeHead(404,{
					"Content-Type":" text/plain"
				});
				response.end("file not exists");
			}
		})
	},
	badrequest:function(header,response){
		response.writeHead(404,{
			"Content-Type":" text/plain"
		})
		response.end("file not exists");
	},
	getmime:function (extName){
		return configuration.config.mime[extName];
	},
	getext:function(_path){
		var extName = path.extname(_path);
		if(extName.indexOf(".")==0){
			extName = extName.substr(1,extName.length);
		}
		return extName;
	}
}

module.exports.handle = handle;
