/**
 * 为导入JSON试题而设计的试题分析库，负责接受JSON格式的试题，
 * 并保存为试题的格式，能输出到json文件中去
 * 导入的格式分析：
 * 1.   导入的一般是一个对象格式，其中的type属性表明这个文件所有包含试题的题型
 * 2.   its属性就是所有的试题构成的数组，主要有两种类型的对象构成 group 和 question, 通过cls属性来判别
 * 3.   question对象包含desc和ans两个有用的属性，其中ans又是一个数组，包含desc，vld两个属性，可直接对应一个试题
 * 4.   group包含多个question对象，可形成一个带多个样式的试题
 * 5.   手工添加category属性表明试题的类属
 * Created by yy on 2015/6/22.
 */
var fs           = require('fs');

module.exports = (function (){
    var qLib = {};

    //将发现的问题全部转换成YiPan需要的JSON格式
    qLib.convert = function(readed){
        qLib.json = null;
        /**
         * "type": "单选"                     //从
         ,"category": "第三章 静态测试"      //第一行中最后一个/之后的字符串
         ,"form":                            //默认就是一个样式
            [{
                "desc", "ans"[{"desc","isValid"}]
            }]
         */
        var json = [];

        var type = readed.type;
        var its = readed.its;

        var form;
        for(var i in its){
            form = qLib.readQuestion(its[i]);
            if(form && form.length>0)
                json.push({type:type, category:its[i].category, desc:form[0].desc, form:form});
        }

        qLib.json = json;
        console.log('发现 ', json.length, ' 个问题！');
    };

    /** 转换一个问题的答案数组 */
    qLib.readAnswer = function(item){
        var ans = [];

        for(var i in item){
            if(item[i].vld)
                ans.push({desc:item[i].des, isValid:true});
            else
                ans.push({desc:item[i].des});
        }

        return ans;
    };

    /** 转换一个问题，主要是描述和答案的数组， 即form属性 */
    qLib.readQuestion = function(item){
        var q = [];
        if(item.cls == 'Question'){
            q.push({desc: item.des, ans: qLib.readAnswer(item.ans)});
        }else if(item.cls == 'Group'){
            //有多个样式
            for(var i in item.qts){
                q.push({desc: item.qts[i].des, ans: qLib.readAnswer(item.qts[i].ans)});
            }
        }else{
            console.log('unknown cls property: ', JSON.stringify(item));
            return null;
        }
        return q;
    };

    //输出到文本文件
    qLib.output = function(fileName){
        //console.log(JSON.stringify(qLib.data.json));
        if(qLib.json){
            // 如果用writeFile，那么会删除旧文件，直接写新文件
            fs.appendFile(fileName, JSON.stringify(qLib.json), function(err){
                if(err)
                    console.log("写入文件[" , fileName , "]失败 " , err);
                else
                    console.log("写入文件[" , fileName , "]成功。 ");
            });
        }else{
            console.log('转换文件失败：', JSON.stringify(qLib.json));
        }
    };

    return qLib;
})();
