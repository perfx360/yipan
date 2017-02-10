/**
 * 为导入试题而设计的试题分析库，负责接受从文本文件中读入的试题，并根据上下文保存为试题的格式
 * Created by yy on 2015/6/22.
 */
var fs           = require('fs');

module.exports = (function (){
    var qLib = {};
    //当前状态
    qLib.current = null;
    //保存转化后信息的对象结构
    qLib.data = null;

    //自动机初始化
    qLib.init = function(){
        qLib.current = qLib.stateBegin;
        qLib.data = {type:'',found:[], desc:'', ans:[]};
    };

    //初始状态，遇到注释行后转入注释状态，并记录注释中的章节信息
    //由于注释中体现的章节信息不标准，这里忽略这个信息，直接从题干开始
    qLib.stateBegin = function(transite){
        //如果是数字加点的形式则是一个新题目的开始
        //匹配模式是开始的以数字加点的形式
        var matched = transite.match( /^\d+\./);
        if(matched && matched.length>0){
            //开始一个新问题，保存一个新题干
            qLib.data.desc = transite.substr(matched[0].length);

            //转到读取题干状态
            qLib.current = qLib.stateDesc;
        }
        //其他所有输入都忽略
    };

    //读取新题干状态，转入下一状态的标志是遇到答案ABCD加点的形式
    //否则可以认为是题干分行写的形式，加入到已有的题干中去
    qLib.stateDesc = function(transite){
        //如果是数字加点的形式则是一个新题目的开始
        //匹配模式是开始的以数字加点的形式
        var matched = transite.match( /^\w\./);
        if(matched){
            //开始一个新候选答案，并保存下来
            qLib.newAnswer(transite);

            //转到读取答案状态
            qLib.current = qLib.stateAnswer;
        }else {
            //其他所有输入都是为题干的延伸
            qLib.data.desc += transite;
        }
    };

    //读取候选答案状态，转入下一状态的标志是遇到“试题编号:”
    //否则看看是否是候选答案的格式，以便增加新候选答案，
    // 否则则视为上一个候选答案题干的延伸
    qLib.stateAnswer = function(transite){
        if(transite.indexOf('试题编号:')==0){
            //转到读取参考答案状态
            qLib.current = qLib.stateValidAnswer;
        }else {
            //如果是数字加点的形式则是一个新题目的开始
            //匹配模式是开始的以数字加点的形式
            var matched = transite.match(/^\w\./);
            if (matched) {
                //开始一个新候选答案，保存下来
                qLib.newAnswer(transite);
            } else {
                //其他所有输入都是上一个候选答案的延伸
                qLib.extendAnswer(transite);
            }
        }
    };

    // 参考答案，转入下一状态的标志是遇到“答案:”
    qLib.stateValidAnswer = function(transite){
        if(transite.indexOf('答案:')==0){
            //设置参考正确答案
            qLib.setValidAnswer(transite.substr('答案:'.length));

            //转到读取试题类型状态
            qLib.current = qLib.stateType;
        }
    };

    // 试题类型，转入下一状态的标志是遇到“题型:”
    qLib.stateType = function(transite){
        if(transite.indexOf('题型:')==0){
            //设置题型
            var type = transite.substr('题型:'.length);
            if(qLib.data.type.indexOf(type)<0)
                qLib.data.type += ',' + type;

            //完成一个问题的读取
            qLib.finishOne();

            //转到开始状态，等待下一个新问题的出现
            qLib.current = qLib.stateBegin;
        }
    };

    //加入一个候选答案
    qLib.newAnswer = function(desc){
        qLib.data.ans.push({desc:desc});
    };

    //设置参考答案
    qLib.setValidAnswer = function(answerCode){
        //比较所有现在发现的候选答案，如果其有制定前缀，则标记为参考答案
        for(var i in qLib.data.ans) {
            if(qLib.data.ans[i].desc.indexOf(answerCode)==0)
                qLib.data.ans[i].isValid = true;
        }
    };

    //延伸上一个候选答案
    qLib.extendAnswer = function(desc){
        var len = qLib.data.ans.length;
        //找到最后一个候选答案，延伸其题干部分
        if(len>0){
            qLib.data.ans[len-1].desc += desc;
        }
    };

    //完成解析一个问题，保存问题到发现的数组中
    qLib.finishOne = function(){
        //是否需要保存原来的问题，通过检查是否保存了题干来检测
        if(qLib.data.desc){
            //格式化候选答案数组，因为答案数组都附带有ABCD加点的前缀，要统一去除
            var ans = [];
            for(var i in qLib.data.ans) {
                if(qLib.data.ans[i].isValid)
                    ans.push({desc:qLib.data.ans[i].desc.substr(2),isValid:true});
                else
                    ans.push({desc:qLib.data.ans[i].desc.substr(2)});
            }

            //加入到发现的数组中
            qLib.data.found.push({
                desc:qLib.data.desc
                ,ans:ans
            });
        }

        //为下一个问题进行初始化
        qLib.data.desc = '';
        qLib.data.ans = [];
    };

    /** 接受文本中读取的一行数据 */
    qLib.consume = function(line){
        if(line && line.trim().length>0) {
            //当前状态接受到一个过渡
            qLib.current(line.trim());
        }
    };

    //将发现的问题全部转换成YiPan需要的JSON格式
    qLib.generateJSON = function(){
        qLib.data.json = null;
        /**
         * "type": "单选"                     //最后一行题型从获取
         ,"category": "第三章 静态测试"      //第一行中最后一个/之后的字符串
         ,"form":                            //默认就是一个样式
            [{
                "desc", "ans"[{"desc","isValid"}]
            }]
         */
        var json = [];
        var type = qLib.data.type;
        if(type.length<1) return;
        //去掉开始的,
        type = type.substr(1);
        if(type.indexOf(',')>-1){
            //再次发现，表示有多个类型，这是目前不允许的
            return;
        }else //合法的类型标志只取前2位
            type = type.substr(0,2);

        for(var i in qLib.data.found){
            json.push({type:type,form:[{
                desc:qLib.data.found[i].desc
                ,ans:qLib.data.found[i].ans
            }]});
        }

        qLib.data.json = json;
    };

    //输出到文本文件
    qLib.output = function(fileName){
        //组成YiPan需要的导入格式
        qLib.generateJSON();

        //console.log(JSON.stringify(qLib.data.json));
        if(qLib.data.json){
            // 如果用writeFile，那么会删除旧文件，直接写新文件
            fs.appendFile(fileName, JSON.stringify(qLib.data.json), function(err){
                if(err)
                    console.log("写入文件[" , fileName , "]失败 " , err);
                else
                    console.log("写入文件[" , fileName , "]成功。 ");
            });
        }else{
            console.log('转换文件失败：', JSON.stringify(qLib.data));
        }

    };

    return qLib;
})();
