/**
 * 为了导入从SmartExam导出的试题文本而写的转换函数
 * 导出格式为：
 *
 * //[父试题分类]:试题分类/算法与C语言程序设计/第一章 C语言程序设计概述/第一章 C语言程序设计概述

   [试题分类]:

    1.以下叙述不正确的是（       ）
    A.一个C源程序可以由一个或多个函数组成
    B.一个C源程序必须包含一个main函数
    C.C程序的基本组成单位是函数
    D.在C程序中，注释说明只能位于一条语句的后面
    试题编号:E18525
    答案:D
    题型:单选题
 规律为：每道题从试题分类开始，以连续的数字加点开始一道题的描述，
 然后是ABCD加点开始的四个候选答案，在试卷编号之后有答案，以及题型
 *
 * 转化目标为：
 * {
        "type": "单选"                     //最后一行题型从获取
        ,"category": "第三章 静态测试"     //第一行中最后一个/之后的字符串
        ,"form":                            //默认就是一个样式
            [{
                "desc": "试题的一个简单样式题干，注意编码格式必须是UTF8，否则不能显示中文"
                                            //数字加点开始的字符行，会不会超行？
                , "ans":                    //ABCD加点对应的候选答案
                    [{
                        "desc": "设计的正确答案"
                        , "isValid":true    //答案行后跟的ABCD
                    },{
                        "desc": "候选答案1"
                    },{
                        "desc": "候选答案2"
                    },{
                        "desc": "候选答案3"
                    }]
            }]
    }
 *
 * 程序步骤:
 *  1.  读取文本文件的每一行，记录必要信息，组成输出数组对象；
 *  2.  输出统计信息，并输出数组对象到文件中
 * Created by Administrator on 2016/4/1.
 */
var async        = require('async');
/**存放需要导入的SmartExam导出的文件的目录
 * TODO 导入的文件的要求：
 * 1. 必须以 .txt 结尾，
 * 2. 以UTF8编码
 * 3. 导出文件名的格式为：<原文件名>.json
 *      例如： abc.txt 导出为 abc.txt.json
 *    所以不能有与导出文件同名的文件，否则会添加到这个文件中
 * @type {string}
 */

var importDir = 'D:/yuyi/SmartExam/20160402转易盘/TOC/';
//需要导入的文件模板正则表达式
var fileReg = '/C\d+\.txt/';
//转换机
var qLib = require('./questionParse.js');
//目录的所有文件读取
var DirList = require('./dirList.js');

//读取文件，并异步的处理文件
DirList.readDir(importDir, function(err, list){
    if(err){
        console.log('读取导入目录下的文件列表出错：', err);
        return;
    }

    if(!list || list.length<1) {
        console.log('读取导入目录下的文件列表出错：没有读取到任何文件');
        return;
    }

    var index = 0;
    var len = list.length;
    async.whilst(
        function(){
            return index<len;
        },function(cb){
            var fileName = list[index].name;
            index ++;
            //目前只处理txt文件
            var pos = fileName.lastIndexOf('.');
            var extension = fileName.substr(pos+1);
            if('|txt|'.indexOf(extension) <0) {
                cb();
                return;
            }

            //拼接成完整的文件路径
            fileName = importDir + fileName;

            //完成转换
            qLib.init();
            var lineReader = require('./line_reader');
            lineReader.eachLine(fileName, function (line, last) {
                qLib.consume(line);

                if (last) {
                    //输出成json文件
                    console.log('成功读入 ', fileName);
                    fileName += '.json';
                    qLib.output(fileName);
                    console.log('\t成功写入 ', fileName);
                    cb();
                }
            });
        },function(){
            console.log('Done');
        }
    );
});


