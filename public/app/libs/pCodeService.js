/**
 * 权限的编码格式
 * Created by yy on 2015/6/22.
 */
angular.module('pCodeService',[])
    .factory('PCode', function() {
        var pCode = {};
        //基准字符
        pCode.StandardChar = '0';

        //核心的权限对照表
        pCode.table = {
            'supplier':['view','update','delete','create']
            ,'log':['view','clear','delete']
            ,'user':['view','update','delete','create']
            ,'role':['view','update','delete','create']
        };

        //为了便于获取视图的名称列表，这里取出每一个视图，加入到数组中
        pCode.collectFrame = function(){
            pCode.frame = [];
            for(var i in pCode.table){
                pCode.frame.push(i);
            }
        };
        pCode.collectFrame();

        //获得指定位置的视图名称
        pCode.frameAt = function(pos) {
            return pCode.frame[pos];
        };

        //将特定视图的设定权限转化成字符
        //例如frame=user, permits={view:true,delete=false,update=false,create=true}
        //需要查询table对应的视图，按照顺序构建二进制数值，最后基于基准字符算出对应字符
        pCode.encode = function(frame, permits){
            var arr    = pCode.table[frame];
            //依次查询定义的权限是否被授权
            var num    = 0;
            var binary = 1;
            for(var i in arr){
                if(permits[arr[i]]){
                    num += binary;
                }
                //准备下一次的二进制数值
                binary *= 2;
            }
            //扫描结束后找到与基准字符偏差正好是num的字符
            return String.fromCharCode(num + pCode.StandardChar.charCodeAt(0));
        };

        //根据字符计算出对应的权限对象
        //例如frame=user, pChar=3=0+[11B]
        //表示具有User视图的第一和第二个权限，需要返回结果为：
        //{view:true,update:true,delete:false,create:false}
        pCode.decode = function(frame, pChar){
            //求出与基准字符的位置差
            var num = pChar.charCodeAt(0) - pCode.StandardChar.charCodeAt(0);
            var arr = pCode.table[frame];
            //依次查询定义的权限是否被授权
            var p = {};
            var mask = 1;
            for(var i in arr) {
                p[arr[i]] = ((num & mask)?true:false);
                //向右移一位
                num = num >>> 1;
            }
            return p;
        };
        return pCode;
    });
