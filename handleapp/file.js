/**
 * Created with JetBrains WebStorm.
 * User: LE
 * Date: 13-8-3
 * Time: 下午8:12
 * To change this template use File | Settings | File Templates.
 */

var mongo  = require("../lib/mongoClient.js"),
    Grid = require("mongodb").Grid,
    fs = require("fs"),
    path = require("path"),
    handleBase = require("./../lib/handleAppBase.js").handleBase;

var _handler = {
    "uploadimg.isAuth":true,
    uploadimg:function(header,response){
        //console.dir(header.files)
        var _filePath = header.files.imgFile.path;
        var name = path.basename(_filePath);
        var extName = path.extname(header.files.imgFile.name);
        var newName = utility.Format("{0}{1}",name,extName);
        fs.readFile(_filePath,function(err,data){
            if(err){
                console.dir(err);
            }
            //console.dir(data);
            mongo.mongo(function(err,db,release){
                var grid = new Grid(db,"fs");
                grid.put(data,{},function(_err,result){
                    //console.dir(result);
                    release();
                    var url = utility.Format("./file/getimg?imgid={0}",result._id);
                    response.endJson({
                        error:0,
                        url:url
                    });
                })
            })

        })
        /*fs.rename(_filePath,utility.Format("{0}{1}",_filePath,extName),function(err){
            if(err) {
                utility.handleException(err);
                return response.endJson({
                    error:1
                });
            }
            var url = utility.Format("./temp/{0}",path.basename(newName));
            response.endJson({
                error:0,
                url:url
            });
        })
        console.dir({
            config:configuration.config.runtime.uploadDir,
            path:_filePath,
            filePath:newName,
            url:utility.Format("./temp/{0}",path.basename(newName))
        });*/
    },
    getimg:function(header,response){
        var id = header.get("imgid");
        mongo.mongo(function(err,db,release,genid){
            var grid = new Grid(db,"fs");
            grid.get(genid(id),function(err,data){
                response.setHeaderItem({
                    key:"Content-Type",
                    value:"image/jpeg"
                });
                response.end(data);
                release();
            })
        })
    },
    getimgstr:function(header,response){
        var id = header.get("imgid");
        mongo.mongo(function(err,db,release,genid){
            var grid = new Grid(db,"fs");
            grid.get(genid(id),function(err,data){
                response.setHeaderItem({
                    key:"Content-Type",
                    value:"text/plain"
                });
                console.log(data.toString("base64"));
                //response.write("data:image/jpeg;base64,")
                response.end(data,"base64");
                release();
            })
        })
    },
    upload:function(header,response){
        //response.end("Finish");
        console.log(header.files.files.path);
        if(header.files&&header.files.files.path){
            var _filePath = header.files.files.path;
            var name = path.basename(_filePath);
            var extName = path.extname(header.files.files.name);
            var newName = utility.Format("{0}{1}",name,extName);
            fs.readFile(_filePath,function(err,data){
                if(err){
                    console.dir(err);
                }
                //console.dir(data);
                mongo.mongo(function(err,db,release){
                    var grid = new Grid(db,"fs");
                    grid.put(data,{},function(_err,result){
                        //console.dir(result);
                        release();
                        var url = utility.Format("./file/getmp3?id={0}",result._id);
                        response.endJson({
                            error:0,
                            url:url
                        });
                    })
                })

            })
//            fs.unlink(header.files.files.path,function(result){
//                console.dir({
//                    result:result,
//                    msg:"删除成功"
//                });
//            })
        }

    },
    getmp3:function(header,response){
        var id = header.get("id");
        if(id){
            mongo.mongo(function(err,db,release,genid){
                var grid = new Grid(db,"fs");
                grid.get(genid(id),function(err,data){
                    if(err){
                        response.setHeaderItem(200,{
                            "Content-Type":"audio/mpeg"
                        });
                        response.end();
                    }
                    if(data){
                        response.setHeaderItem(200,{
                            key:"Content-Type",
                            value:"image/jpeg"
                        });
                        response.end(data);
                        release();
                    }
                });
            });
        }else{
            response.end();
        }
    }
};

var app = new handleBase("file",_handler);

function handle(header,response){
    app.handle(header,response);
}
app.isAuthorization = false;
module.exports.handle = handle;