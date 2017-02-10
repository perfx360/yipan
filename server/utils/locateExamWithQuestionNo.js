/**
 *
 * 用来定位由于试题错误而引起的试卷查询，需要根据给定的试题编号，查询有哪些试卷包含了这道题
 * 打印所有的学生信息，便于手工加分。
 *
 * Created by Administrator on 2016/4/8.
 */
var fs           = require('fs');
var config = require('../../config');
var mongoose = require('mongoose');
mongoose.connect(config.database);
var Exam = require('../models/exam');
//这句话很重要，在关联时需要用
require('../models/user');


var fileName = './包含试题Q0000025-0的学生名单.txt';
Exam
    .find({'questions.questions.code':'Q0000025-0'})
    .select('config tester score point isSubmit')
    .populate('tester', 'name code')
    .exec(function(err,res){
    if (err) {
        console.log('Error find: ', err);
    } else {
        console.log('Found ', res.length ,' exams.');

        var json = [];
        for(var i in res){
            if(res[i].isSubmit)
                json.push(i+' '+ res[i]._id+ ' '+ res[i].config+ ' '+ res[i].score+ ' '+ res[i].point
                    + ' '+ res[i].tester.name+ ' '+ res[i].tester.code);
            else
                json.push(i+' '+ res[i]._id+ ' '+ res[i].config+ ' '+ res[i].score+ ' '+ res[i].point
                    + ' '+ res[i].tester.name+ ' '+ res[i].tester.code+ ' 未交卷');
        }
        fs.appendFile(fileName, json.join('\n'), function(err){
            if(err)
                console.log("写入文件[" , fileName , "]失败 " , err);
            else
                console.log("写入文件[" , fileName , "]成功。 ");
        });
    }
});