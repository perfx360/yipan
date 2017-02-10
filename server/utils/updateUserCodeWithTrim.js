/**
 * 从Excel导入的数据中有些数据可能会有前后的空格和换行符号，这里统一去掉这些符号
 * Created by Administrator on 2016/3/16.
 */

var mongoose = require('mongoose');
var config = require('../../config');       // read configurations
mongoose.connect(config.database);

var User = require('../models/user.js');

//查找所有的用户
User.find({}).exec(function(err,res){
    if(err){
        console.log('Error find: ', err);
    } else {
        var count = 0;
        var codes = [];
        for(var i in res){
            //检查用户的代号
            var code = res[i].code.replace(/(\n|\r|(\r\n)|(\u0085)|(\u2028)|(\u2029))/g, '').trim();
            //如果代号发生了变化说明存在换行或者空格符号，则需要重新保存一下
            if(code != res[i].code) {
                //res[i].code = code;
                //res[i].save(function (err) {
                //    if (err) {
                //        console.log('Error save with id=', res[i]._id, ': ', err);
                //    }else{
                //        console.log('saved one');
                //    }
                //});
                count ++;
                codes.push(code);
            }
        }
        console.log('found incorrect codes: ', count);
        console.log(JSON.stringify(codes));
    }
});
