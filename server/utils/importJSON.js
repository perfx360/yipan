/**
 * 导入Json格式的试题
 *
 * 这里使用jsonfile插件，只是文件格式不知如何设置才能被其识别，只好用一个笨办法
 * 先用jsonfile自己导出一个模板文件，然后再把内容拷贝到模板文件中，就能识别了。
 *
 * Created by Administrator on 2016/4/6.
 */
//var filename = 'D:/MEAN-workspace/my/YiPan/singleLess.json';
//var filename = 'D:/MEAN-workspace/my/YiPan/data.json';
var dir = 'D:/yuyi/Lecture/软件测试/2016SS/mongo_import/formatted/';
//var filenames = ['singleLess'];
var filenames = ['single', 'multi' ,'fill'];
//var filenames = ['single', 'singleLess', 'multi' ,'multiLess' ,'fill'];

var jsonfile = require('jsonfile');
var util = require('util');
var async        = require('async');

//jsonfile.spaces = 4;
//
//var file = './data.json'
//var obj = {name: 'JP', dat: '炅立'}
//
//// json file has four space indenting now
//jsonfile.writeFile(file, obj, 'UTF8', function (err) {
//    console.error(err)
//});

var index = 0;
var len = filenames.length;
var filename;
//转换机
var qLib = require('./questionConvert.js');

async.whilst(
    function(){
        return index<len;
    },function(cb){
        filename = dir + filenames[index] + '.json';
        index ++;

        jsonfile.readFile(filename, 'UTF8', function(err, obj) {
            if(err)
                cb(err);
            else {
                console.log('--------------------------------------------');
                console.log('--- 成功读取 ', filename, ' ---');
                qLib.convert(obj);
                qLib.output(filename + '.formatted.json');
                console.dir(JSON.stringify(qLib.json[0]));
                console.log('--------------------------------------------');
                cb();
            }
        });
    },function(error){
        if(error){
            console.log('Error by reading ', filename, '\t', error);
        }else
            console.log('Done');
    }
);
