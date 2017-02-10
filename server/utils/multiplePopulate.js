/**
 * 为了测试Mongoose执行查询的管道功能，测试Exam数据集合的查询功能，
 * 分别populate config和tester两个字段
 * Created by Administrator on 2016/7/5.
 */

var mongoose = require('mongoose');
var config = require('../../config');       // read configurations
mongoose.connect(config.database);

var Exam = require('../models/exam');
require('../models/examconfig');
require('../models/user');

var query = Exam.findOne({isCorrected:true});
query = query.select('config tester isCorrected');
query = query.populate('config', 'name canReview');
query = query.populate('tester', 'name code');

query.exec(function(err,data){
    if(err) console.log('error ', err);
    else console.log('done ', data);
});