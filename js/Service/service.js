/**
 * Created by Administrator on 2014/7/13.
 */

var appService = angular.module("appServices",["ngResource"]);

appService.factory("common",["$resource",function($resource){
    return $resource('once/main?postSource=:action',{},{
        send:{method:"POST",params:{action:'common'}}
        //send:{method:"POST",params:{action:'admin'},interceptor:{response:function(res){return res.data;}}}
    })
}]);

appService.factory("admin",["$resource",function($resource){
    return $resource('once/main?postSource=:action',{},{
        //send:{method:"POST",params:{action:'admin'}}
        send:{method:"POST",params:{action:'admin'},interceptor:{
            response:function(res){
                if(res.data.err){
                    var hash = location.hash;
                    if(hash!="#/login"&&res.data.msg) alert(res.data.msg)
                    if(res.data.redirectTo) {
                        window.location = res.data.redirectTo;
                        return;
                    }
                }
                return res.data;
            }
        }}
    })
}]);

appService.factory("answer",["$resource",function($resource){
    return $resource('once/main?postSource=:action',{},{
        //send:{method:"POST",params:{action:'answer'}}
        send:{method:"POST",params:{action:'answer'},interceptor:{
            response:function(res){
                if(res.data.err){
                    if(res.data.msg) alert(res.data.msg)
                    if(res.data.redirectTo) {
                        window.location = res.data.redirectTo;
                        return;
                    }
                }
                return res.data;
            }
        }}
    })
}]);

appService.factory("question",["$resource",function($resource){
    return $resource('once/main?postSource=:action',{},{
        //send:{method:"POST",params:{action:'question'}}
        send:{method:"POST",params:{action:'question'},interceptor:{
            response:function(res){
                if(res.data.err&&res.data.redirectTo){
                    if(res.data.msg) alert(res.data.msg)
                    if(res.data.redirectTo) {
                        window.location = res.data.redirectTo;
                        return;
                    }
                }
                return res.data;
            }
        }}
    })
}]);