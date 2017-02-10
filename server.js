"use strict";
/**
 * 后台服务器入口函数，通过node server来启动服务
 * @type {*|exports}
 */

//加载各种服务类型
var express           = require('express');		// call express
var app               = express(); 				// define our app using express
var bodyParser        = require('body-parser'); 	// get body-parser
var morgan            = require('morgan'); 		// used to see requests
var mongoose          = require('mongoose');       // communication with mongodb
var config            = require('./config');       // read configurations
var path              = require('path');           // get support of local file system
var FileStreamRotator = require('file-stream-rotator');
var fs                = require('fs');
var logDirectory      = config.logDir;
var exportDirectory      = config.exportDir;

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
fs.existsSync(exportDirectory) || fs.mkdirSync(exportDirectory);

// create a rotating write stream
var accessLogStream = FileStreamRotator.getStream({
    filename: logDirectory + '/access-%DATE%.log'
    , frequency: 'daily'
    , verbose: false
    , date_format: "YYYY-MM-DD"
});

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

/**
 * 当前应用使用URL的JSON编码，统一传输信息的格式，以便全部用json格式来读写信息
 */
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

/**
 * 当前应用中所有的请求中加入制定的响应信息
 */
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
    next();
});

/**
 * 利用morgan框架输出所有的请求到控制台
 */
var logger = morgan('combined', {
    stream: accessLogStream
    ,skip: function(req, res) { return res.statusCode < 400}
});
app.use(logger);
//app.use(morgan('dev'));

/**
 * 连接到数据库
 */
mongoose.connect(config.database);

/**
 * 设置静态代码目录位置，即此目录下所有文件都可见
 */
app.use('/public', express.static(__dirname + '/public'));

/**
 * 读取服务器端定义的路由规则
 * @type {apiRouter|exports}
 */
var apiRoutes = require('./server/api')(app, express);
app.use('/api', apiRoutes);

/**
 * 设定所有路径都指向index.html,
 */
app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname + '/public/app/index.html'));
});

/**
 * 启动服务器，监听前端的请求
 */
app.listen(config.port);
console.log('Magic happens on port ' + config.port);