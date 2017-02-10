/**
 * 替换一个程序文件中的中文字符，写回到源文件中，使得程序文件可以直接执行
 * Created by Administrator on 2016/4/20.
 */

var fileName = '11.js';
var fs           = require('fs');
var lineReader = require('./line_reader.js');

var corrected = [];

var chnChars = [
    {chn:'；', en:';'}
    ,{chn:'：', en:':'}
    ,{chn:'“', en:'"'}
    ,{chn:'”', en:'"'}
    ,{chn:'（', en:'('}
    ,{chn:'）', en:')'}
    ,{chn:'，', en:','}
];

//替换一行文本中的中文字符
var replaceLine = function(line){
    if(!line) return '';
    line = line.replace(/；/g, ';');
    line = line.replace(/：/g, ':');
    line = line.replace(/，/g, ',');
    line = line.replace(/“/g, '"');
    line = line.replace(/”/g, '"');
    line = line.replace(/（/g, '(');
    line = line.replace(/）/g, ')');
    return line;
}

//读取程序文件的每一行
lineReader.eachLine(fileName, function (line, last) {
    //将替换后的文本放进数组
    corrected.push(replaceLine(line));

    //结束以后，输出到原文件中
    if (last) {
        //输出成json文件
        console.log('成功读入 ', fileName);

        var newName = fileName + '.en.js';
        // 如果用writeFile，那么会删除旧文件，直接写新文件
        fs.appendFile(newName, corrected.join('\n'), function(err){
            if(err)
                console.log("写入文件[" , newName , "]失败 " , err);
            else
                console.log("写入文件[" , newName , "]成功。 ");
        });

        console.log('\t成功写入 ', fileName);
    }
});
