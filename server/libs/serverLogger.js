var pCode = require('./pCode');
var Log = require('../models/log');
var fs = require('fs');
var logOutput = "./logerror.txt";

/**
 * 服务器端验证和日志函数
 */
module.exports.allowed = function (frame,permit, currentUser) {
    //获取当前请求对应的权限数值
    if(pCode.table[frame] && currentUser){
        //获取当前用户的权限字符串，需要确定两个位置：当前视图序号和当前查询的权限序号
        var framePos  = pCode.getFramePos(frame);
        var permitPos = pCode.getPermitPos(frame, permit);
        if(framePos<0 || permitPos<0) return false;
        //取出指定视图对应的授权字符
        var s = currentUser.permits.charCodeAt(framePos);
        s -= pCode.StandardCode.charCodeAt(0);
        var mask = 1 << (permitPos);
        return (mask & s);
    }
    return false;
};

/**
 * 登记日志功能
 * @param user          操作用户ID
 * @param path          路径
 * @param method        方法
 * @param parameters    参数
 * @param url           超链接
 * @returns {*}
 *
 * 编写日志注意点：
 * 1.   注意一些转义的方法，delete 有时代表清空，patch代表计数，put有时代表分页查询
 * 2.   删除单个记录时需要自己构造parameters，因为请求中没有提供
 * 3.   新增记录时需要自己构造url
 */
module.exports.log = function (user,path,method,parameters,url) {
    var logger    = new Log();
    logger.user   = user;
    logger.method = method.toLowerCase();
    if(parameters)
        logger.parameters = JSON.stringify(parameters);

    /** path格式可能为/users/或者是/users/555555555
    //为了后台容易翻译，这里统一变成/users/和/users/s的模式，
    //而后者可以为追踪的url所用
    //这里一共有5中形式：
    // 形式 path  method => path method parameters url
    // 分页 /users/ put  => /users/ get criteria null
    // 新增 /users/ post  => /users/s post body /users/:id
    // 查询 /users/:id get  => /users/s get body /users/:id
    // 更新 /users/:id put  => /users/s put body /users/:id
    // 删除 /users/:id delete  => /users/s delete body null
    // 任务：  1. 能区分path的两种形态，用 var reg = /\/\w+\/\w+/;
    //         2. 新增需要传入Url
    //
    //由于查询的日志很多且没有太大意义，决定不保留查询日志，而增加清空日志，所以一共支持4中形式
        形式 path  method => path method parameters url
     // 清空 /users/ delete   => /users/ delete null null
     // 新增 /users/ post     => /users/s post body /users/:id
     // 更新 /users/:id put   => /users/s put body /users/:id
     // 删除 /users/:id delete  => /users/s delete body null
     */

    //首先区分path为两大类
    var single = /\/\w+\/\w+/;
    var prefix = /\/\w+\//;

    if(path.match(single)){
        var matched = path.match(prefix)[0];
        logger.path = matched + 's';
        //唯独删除没有超链接
        if(logger.method != 'delete'){
            logger.url = path;
        }
    }else{
        logger.path = path;
        //新增操作需要设置超链接，并修改path
        if(logger.method == 'post') {
            logger.url = url;
            logger.path += 's';
        }
    }

    //保存日志到数据库
    logger.save(function (err) {
        if (err) {
            //一旦报错，输出并保存到文本文件中
            var info = 'Error logging '+ err + ', arguments=' + arguments;
            console.log(info);
            fs.appendFile(logOutput, '\n' + info, function (err) {
                if (err) throw err;
            });
        }
    });
};