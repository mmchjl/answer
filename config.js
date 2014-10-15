


//mime类型
var mime = {
	avi:"video/x-msvideo",
	bmp:"image/bmp",
    css:"text/css",
	doc:"application/msword",
	exe:"application/octet-stream",
	gif:"image/gif",
	htm:"text/html",
	html:"text/html",
	ico:"image/x-icon",
	jpe:"image/jpeg",
	png:"image/png",
	jpeg:"image/jpeg",
	jpg:"image/jpeg",
	js:"text/javascript",
	swf:"application/x-shockwave-flash",
	txt:"text/plain",
	wav:"audio/x-wav",
	xla:"application/vnd.ms-excel",
	xlc:"application/vnd.ms-excel",
	xlm:"application/vnd.ms-excel",
	xls:"application/vnd.ms-excel",
	xlt:"application/vnd.ms-excel",
	xlw:"application/vnd.ms-excel",
	zip:"application/zip",
	mp4:"video/mp4",
	mp3:"audio/mpeg",
    woff:"application/font-woff",
    svg:"image/svg+xml",
    ttf:"application/font-ttf",
    otf:"application/font-otf",
    eot:"application/font-eot",
    json:"application/json"
};

var forbiden =[
	"/favicon.ico",
    "/handleapp",
    "/lib",
    "/logfile",
    "/app.js" ,
    "/config.js",
    "/handler.js",
    "/route.js",
    "/temp1",
    "/server.js"
];

var mongodb_config = {
    username:"",
    password:"",
    server:"127.0.0.1",
    port:27017,
    dbname:"test",
	//connectString:"mongodb://wtoIjGE2TwCNCySToe7IwEbX:rcPXAAVXpC94a9Qk05uGVzPyjPfoZEIP@mongo.duapp.com:8908/NaNnXAmWsKdAxPeQVyZj",
    connectString:"mongodb://account:pwd@127.0.0.1:27017/test"
};

var redis_config = {
    filepath:"D:\\redis\\redisbin_x32\\redis-server.exe",
    password:"pwd",
    server:"127.0.0.1",
    port:6578
};

var runtime = {
    isauth:false,                                       //是否开启验证
    isDebug:true,                                       //是否显示在控制台上debug异常信息
    isLog:true,                                         //是否开启日志
    isLogDb:false,                                      //是否讲日志记录在数据库
    isOpenUnCaughtException:true,                       //是否开启进程内扑捉未catch的异常
    isActiveFenTi:false,                                //是否开启分题类型来队列问题
    basePath:__dirname,                                 //程序运行的根物理路径
    sessionMode:2,                                      //0为进程内；1为进程外；2为redis模式
    sessionExpireTime:1000,                             //单位秒
    uploadDir:__dirname+"\\temp",                       //上传文件的路径
	apphost:"127.0.0.1",
    appport:8080
};

var language={
    serverErr:"服务器繁忙"
};

var powerList={


};

var statuCode={
    noAuth:100,
    serverError:500,
    success:200,
    fail:300,
    noExists:404
};

module.exports.config = {
    mime:mime,
    forbiden:forbiden,
    mongodb:mongodb_config,
    redis:redis_config,
    runtime:runtime,
    language:language
}