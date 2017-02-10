/**
* Created by Administrator on 2015/7/10.
*/
var fs = require('fs');
module.exports = {
    /** 根据指定的类型和编号，构造统一格式的编号字符串
     * 例如：输入 @codeType = question, @no = 23
     * 输出： Q0000023
     * 步骤：首字母大写后 + 补足7位而增加的0 + 编号
     * */
    generateCode : function (codeType, no) {
        var s = '' + no;
        while(s.length<7) s = '0' + s;
        var capital = codeType.charCodeAt(0);
        s = String.fromCharCode(capital-32) + s;
        return s;
    },

    //第一段判断是否有反向代理IP(头信息：x-forwarded-for)，在判断connection的远程IP，以及后端的socket的IP
    getClientIP : function (req) {
        //console.log('req.headers = ',req.headers);
        //console.log('req.socket = ',req.socket);
        //console.log('req.connection = ',req.connection);
        //var reg = /(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
        var ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
        return ip;
        //return ip.match(reg);
    }

    /** 解析IP字符串成4个IP地址位 */
    ,parseIP: function(ip, pattern){
        if(!ip)return null;
        var reg = /(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/g;
        if(pattern)
            reg = pattern;
        var matched = ip.match(reg);
        if(matched){
            //第一个元素就是匹配的IP地址，用.来划分成4个字符
            var items = matched[0].split('.');
            var numbers = [];
            for(var i in items) {
                //第一个元素的第一位可能不是数字
                if(i=='0'){
                    var first = items[0].charAt(0);
                    if(first<='9' && first>='0')
                        numbers.push(Number(items[i]));
                    else
                        numbers.push(Number(items[i].substr(1)));
                }else
                    numbers.push(Number(items[i]));
            }
            return numbers;
        }else
            return null;
    }

    /** 用户给定的ip模式字符串转化成正则表达匹配模板
     *  例如   10.64.45.*
     * */
    , formatIpPattern : function(givenPattern){
        if(!givenPattern) return null;
        var pattern = givenPattern.replace(/\./g, '\\.');
        pattern = pattern.replace(/\*/g, '(\\d{1,2}|1\\d\\d|2[0-4]\\d|25[0-5])');
        return '(^|\\D)' + pattern + '$';
    }

    /** 是否是数组 */
    ,isArray: function (arr) {
        return typeof arr == "object" && arr.constructor == Array;
    }

    //上传文件保存到服务器后的唯一文件名
    ,generateNewName: function(fileFullName){
        //重新命名 <日期+时间>+原始文件名
        var d = new Date();
        return d.format('yyyyMMdd_hhmmssS') + '_' + fileFullName;
    }

    ,copyFile : function(src, target){
        var is = fs.createReadStream(src);
        var os = fs.createWriteStream(target);
        is.pipe(os);
    }
};