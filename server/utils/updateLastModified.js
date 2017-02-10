/**
 * 新增了LastModified字段以后，需要批量重置目前所有的File记录的LastModified的值
 * 方法是，每个记录都查找其历史操作记录中的涉及修改的最近的记录，用其时间替换LastModified的时间。
 * 其中包含的操作有 upload|replace|create|rename|cut|copy|move|paste
 * Created by Administrator on 2016/3/16.
 */

var mongoose = require('mongoose');
var config = require('../../config');       // read configurations
var Schema = mongoose.Schema;
mongoose.connect(config.database);

var File = require('../models/file');

//显示当前数据库的所有信息
var criteria = {};

File.find(criteria).exec(function(err,res){
    if(err){
        console.log('Error find: ', err);
    } else {
        for(var i in res){

            //更新lastModified字段
            if(res[i].history.length>0) {
                for(var j in res[i].history){
                    if('upload|replace|create|rename|cut|copy|move|paste'.indexOf(res[i].history[j].type)>-1){
                        res[i].lastModified = res[i].history[j].date;
                        res[i].save(function (err) {
                            if (err) {
                                console.log('Error save with id=', res[i]._id, ': ', err);
                            }
                        });
                        break;
                    }
                }


            }
        }
    }
});
