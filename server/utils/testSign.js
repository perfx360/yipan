/**
 * ²âÊÔÇ©µ½Êý¾Ý¿â
 * Created by Administrator on 2016/3/16.
 */
var mongoose = require('mongoose');
var config = require('../../config');       // read configurations
var Schema = mongoose.Schema;
mongoose.connect(config.database);

var Sign = require('../models/sign');

Sign.find({}).exec(function(err,res) {
    if (err) {
        console.log('Error find: ', err);
    } else {
        for(var i in res){
            console.log(res[i]._id, ' with detail ', res[i].detail.length);
            //56d4fee721fc738431f15a34
            for(var j in res[i].detail){
                if(res[i].detail[j].name == '56d4fee721fc738431f15a34'){
                    console.log('found 110: ', JSON.stringify(res[i].detail[j]));
                    break;
                }
                //console.log((j+1), '-th ', JSON.stringify(res[i].detail[j].name));
            }
        }
    }
});