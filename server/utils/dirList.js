/**
 * 常用的工具类函数
* Created by Administrator on 2015/7/10.
*/

var fs = require('fs');
var path = require('path');
module.exports = {
    /** 异步获取函数 */
    readDir : function(dir, done) {
        var results = [];
        var len = dir.length;
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                //获取绝对路径
                file = path.resolve(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        results.push({isFile:false,name:file.substr(len),size:stat.size,modified:stat.mtime});
                        if (!--pending) done(null, results);
                    } else {
                        results.push({isFile:true,name:file.substr(len),size:stat.size,modified:stat.mtime});
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    }
};