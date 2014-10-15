var mongo = require("./mongodb.js");


module.exports.query = function query(opt,callback){
     var collection = opt.collection;
     var query = opt.query||{};
     var fields = opt.fields||{};
     var index = opt.pageIndex||1;
     var sort =opt.sort||[];
     var size = opt.pageSize||10;
     var option = {
         skip:(index-1)*size,
         limit:size,
         sort:sort
     };
    if(opt.pageSize==0) {
        delete option.limit;
        delete option.skip;
    }
    mongo(function(err,client,release){
        if(!utility.isUndefined(client)){
            client.collection(collection,function(err,coll){
                if(err){
                    release()
                    utility.handleException(err);
                    return callback(err);
                }
                coll.find(query,fields,option).toArray(function(err,data){
                    if(err){
                        release()
                        utility.handleException(err);
                        return callback(err);
                    }
                    release();
                    return callback(err,data)
                })
            })
        }
    })
 }

module.exports.update = function update(opt,callback){
    var collection = opt.collection,
        query =opt.query||{},
        obj = opt.newObject;
        mongo(function(err,client,release,genid){
            if(!utility.isNull(client)){
                client.collection(collection,function(err,col){
                    if(err){
                        release();
                        utility.handleException(err);
                        if(callback) return callback(err);
                    }
                    var temp = query["_id"];
                    if(!utility.isNull(temp)){
                        query["_id"] = genid(temp);
                    }
                    var option = {
                        safe:true
                    };
                    col.update(query,obj,option,function(err,data){
                        release();
                        if(callback) callback(err,data);
                    });
                });
            }
        });
}

module.exports.upsert =function upsert(opt,callback){
    var collection = opt.collection,
        query = opt.query||{},
        obj = opt.newObject;
        mongo(function(err,client,release,genid){
            if(!utility.isNull(client)){
                client.collection(collection,function(err,col){
                    if(err){
                        release();
                        utility.handleException(err);
                        return callback(err);
                    }
                    var temp = query["_id"];
                    if(!utility.isNull(temp)){
                        query["_id"] = genid(temp);
                    }
                    var option = {
                        safe:true,
                        upsert:true
                    };
                    col.update(query,obj,option,function(err,data){
                        release();
                        if(callback) callback(err,data);
                    });
                });
            }
        });
}

module.exports.findOne = function findOne(opt,callback){
    var collection = opt.collection,
        query = opt.query||{},
        fields = opt.fields||{};
        mongo(function(err,client,release,genid){
            if(!utility.isNull(client)){
                client.collection(collection,function(err,col){
                    if(err){
                        release();
                        utility.handleException(err);
                        return callback(err);
                    }
                    var temp = query["_id"];
                    if(!utility.isNull(temp)){
                        query["_id"] = genid(temp);
                    }
                    var option = {
                        safe:true
                    };
                    col.findOne(query,fields,function(err,data){
                        release();
                        callback(err,data);
                    });
                });
            }
        });
}

module.exports.insert = function insert(opt,callback){
    var collection = opt.collection,
        newObject = opt.newObject;
        mongo(function(err,client,release,genid){
            if(!utility.isNull(client)){
                client.collection(collection,function(err,col){
                    if(err){
                        release();
                        utility.handleException(err);
                        return callback(err);
                    }
                    var option = {
                        safe:true
                    };
                    col.insert(newObject,option,function(err,data){
                        release();
                        if(callback) callback(err,data);
                    });
                });
            }
        });
}

module.exports.remove = function remove(opt,callback){
    var collection = opt.collection,
        query = opt.query||{};
        mongo(function(err,client,release,genid){
            if(!utility.isNull(client)){
                client.collection(collection,function(err,col){
                    if(err){
                        release();
                        utility.handleException(err);
                        return callback(err);
                    }
                    var temp = query["_id"];
                    if(!utility.isNull(temp)){
                        query["_id"] = genid(temp);
                    }
                    var option = {
                        safe:true
                    };
                    col.remove(query,option,function(err,data){
                        release();
                        callback(err,data);
                    });
                });
            }
        })
}

module.exports.count=function(opt,callback){
    var collection = opt.collection||"",
        query = opt.query||{};
    mongo(function(err,client,release,genId){
        if(!utility.isNull(client)){
            client.collection(collection,function(err,col){
                if(err){
                    release();
                    utility.handleException(err);
                    return callback(err);
                }
                col.count(query,function(err,data){
                    release();
                    callback(err,data);
                });
            });
        }
    })
}

module.exports.mongo = mongo;


