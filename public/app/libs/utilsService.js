/**
 * 这里定义了常用的公共函数和方法
 * Created by yy on 2015/9/24.
 */
angular.module('utilsService',[])
    .factory('UtilsService',['$window', function($window) {
        var utils = {};

        /** HTML符号转义和解码函数 */
        utils.html_encode = function(str)
        {
            var s;
            if (!str || str.length == 0) return "";
            s = str.replace(/&/g, "&amp;");
            s = s.replace(/</g, "&lt;");
            s = s.replace(/>/g, "&gt;");
            //s = s.replace(/ /g, "&nbsp;");
            s = s.replace(/\'/g, "&#39;");
            s = s.replace(/\"/g, "&quot;");
            //s = s.replace(/\n/g, "<br>");
            return s;
        };
        utils.html_decode = function(str)
        {
            var s;
            if (!str || str.length == 0) return "";
            s = str.replace(/&amp;/g, "&");
            s = s.replace(/&lt;/g, "<");
            s = s.replace(/&gt;/g, ">");
            //s = s.replace(/&nbsp;/g, " ");
            s = s.replace(/&#39;/g, "\'");
            s = s.replace(/&quot;/g, "\"");
            //s = s.replace(/<br>/g, "\n");
            return s;
        };

        /** 为保存考试的中间结果而是用的生成键值的函数 */
        utils.getStorageKey = function(userId, examId, questionId){
            if(questionId)
                return 'data.' + userId + '.' + examId + '.' + questionId;
            else if(examId)
                return 'data.' + userId + '.' + examId;
            else if(userId)
                return 'data.' + userId;
            else
                return 'data';
        };

        /** 检查是否有指定的缓存信息 */
        utils.hasStorage = function(userId, examId){
            var pattern = new RegExp('^data.' + userId + '.' + examId);
            for(var i=0;i<$window.localStorage.length;i++){
                if($window.localStorage.key(i).search(pattern)>-1)
                    return true;
            }
            return false;
        };

        /** 提交试卷后，删除缓存信息 */
        utils.submitStorage = function(userId, examId){
            var pattern = new RegExp('^data.' + userId + '.' + examId);
            //删除指定用户的指定考试的缓存
            for(var i=$window.localStorage.length-1;i>=0;i--){
                if($window.localStorage.key(i).search(pattern)>-1){
                    $window.localStorage.removeItem($window.localStorage.key(i));
                }
            }
        };

        /** 为了补交试卷，读取缓存中的信息，组合成[{qid, ans[]}]的格式 */
        utils.getAnswers = function(userId, examId){
            var prefix = '^data.' + userId + '.' + examId;
            var pattern = new RegExp(prefix);
            var prefixLen = prefix.length;
            //查询指定用户的指定考试的缓存
            var ans=[];
            var an;
            for(var i=$window.localStorage.length-1;i>=0;i--){
                //如果找到匹配的，则存入一个问题id和答案数组
                if($window.localStorage.key(i).search(pattern)>-1){
                    an = utils.generateAnswer(prefixLen, $window.localStorage.key(i));
                    if(an)
                        ans.push(an);
                }
            }
            if(ans.length>0)
                return ans;
            return null;
        };

        /** 将缓存中的一个键值转化成 问题id和答案数组 */
        utils.generateAnswer = function(prefixLen, key){
            //首先处理答案的索引值数组
            var qid = key.substr(prefixLen);
            //注意有些并不是问题和答案的缓存数据
            if(qid=='type' || qid=='index'){
                return null;
            }

            var value = $window.localStorage.getItem(key);
            var ans = null;
            if(value && value.length>0){
                ans = value.split(',');
            }
            return {qid:qid, ans:ans};
        };

        /** 登录后，删除所有非登录用户的缓存信息 */
        utils.loginStorage = function(userId){
            var isMy = new RegExp('^data.' + userId);
            var isCache = new RegExp('^data.');
            for(var i=$window.localStorage.length-1;i>=0;i--){
                //只删除是考试缓存，且不属于自己的
                if($window.localStorage.key(i).search(isCache)>-1
                    && $window.localStorage.key(i).search(isMy)==-1){
                    $window.localStorage.removeItem($window.localStorage.key(i));
                }
            }
        };

        //将带单位的文件大小转化成以Byte为单位的文件大小
        utils.toFileSize = function(fileSizeWithUnit){
            var regUnit    = /[B|K|M|G|T|P|E|b|k|m|g|t|p|e]/;
            var regNumUnit = /^\d+[B|K|M|G|T|P|E|b|k|m|g|t|p|e]\b/;
            //先将字符串格式化
            var fileSize   = fileSizeWithUnit.replace(/(^\s*)|(\s*$)/g, "");
            var len        = fileSize.length;
            //长度必须大于1，不允许数字不带单位。
            if(len<=1) return null;
            //格式为数字+单位
            if(!fileSize.match(regNumUnit)) return null;
            //获取单位字符
            var unit = fileSize.match(regUnit);
            if(unit)
                unit = unit[0];
            else
                unit = 'b';

            //获取数字字符
            var fileSizeFormatted = Number(fileSize.replace(regUnit,''));
            if(unit.toLowerCase() == 'k')
                fileSizeFormatted *= 1024;
            else if(unit.toLowerCase() == 'm')
                fileSizeFormatted *= 1024*1024;
            else if(unit.toLowerCase() == 'g')
                fileSizeFormatted *= 1024*1024*1024;
            else if(unit.toLowerCase() == 't')
                fileSizeFormatted *= 1024*1024*1024*1024;
            else if(unit.toLowerCase() == 'p')
                fileSizeFormatted *= 1024*1024*1024*1024*1024;
            else if(unit.toLowerCase() == 'e')
                fileSizeFormatted *= 1024*1024*1024*1024*1024*1024;

            return fileSizeFormatted;
        };

        //将以Byte为单位的文件大小转化成以BKMGTPE为单位的文件大小
        utils.toFileSizeWithUnit = function(fileSize){
            var size = Number(fileSize);
            if(size<=0) return '0';
            var units     = ['B','K','M','G','T','P','E'];
            var unitIndex = 0;
            var original  = 0;
            while(size>0){
                if(size<1024){
                    //确定是否带小数点
                    if(size<original){
                        if((original-size)>=0.1)
                            size = original.toFixed(2);
                    }
                    return size + units[unitIndex];
                }else {
                    original = (size / 1024);
                    size = original.toFixed(0);
                    unitIndex ++;
                }
            }
            return size + '?';
        };

        /** 已经使用的容量的进度条随着磁盘容量比例使用不同的class
         * 低于80% progress-bar-success
         * 低于90% progress-bar-warning
         * 高于90% progress-bar-danger
         * */
        utils.getSizeClass = function(fullSize, usedSize){
            var pClass = ['progress-bar-success','progress-bar-warning','progress-bar-danger','progress-bar-info'];
            if(!fullSize || fullSize<=0) return pClass[0];

            var procent = ((usedSize / fullSize)*100).toFixed(0);
            if(procent<=80) return pClass[0];
            if(procent<=90) return pClass[1];
            if(procent<=100) return pClass[2];
            return pClass[3];
        };

        /** 日期格式化函数 */
        utils.formatDate = function(date, fmt)
        {
            var o = {
                "M+" : date.getMonth()+1,                 //月份
                "d+" : date.getDate(),                    //日
                "h+" : date.getHours(),                   //小时
                "m+" : date.getMinutes(),                 //分
                "s+" : date.getSeconds(),                 //秒
                "q+" : Math.floor((date.getMonth()+3)/3), //季度
                "S"  : date.getMilliseconds()             //毫秒
            };
            if(/(y+)/.test(fmt))
                fmt=fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));
            for(var k in o)
                if(new RegExp("("+ k +")").test(fmt))
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
            return fmt;
        };

        return utils;
    }]);
