/**
 * 权限的编码格式
 * Created by yy on 2015/6/22.
 */
module.exports = (function (){
    var pCode = {};
    //基准字符
    pCode.StandardCode = '0';
    //权限的顺序定义表
    pCode.table = {
        'file':['view','update','delete','create']
        ,'log':['view','clear','delete']
        ,'user':['view','update','delete','create']
        ,'role':['view','update','delete','create']
    };

    //为了便于查找，收集所用的视图名称组成一个对象，其值等于在table中的索引值
    pCode.frames = {};
    pCode.collectFrame = function(){
        var index = 0;
        for(var i in pCode.table){
            pCode.frames[i] = index;
            index ++;
        }
    };
    pCode.collectFrame();

    //计算指定视图在定义表的序号，based on 0
    pCode.getFramePos = function(frame){
        if(pCode.frames.hasOwnProperty(frame))
            return pCode.frames[frame];
        return -1;
    };

    //收集所有视图的权限的索引值
    pCode.framePermit = {};
    pCode.collectFramePermit = function() {
        var index;
        var key;
        for(var frame in pCode.table) {
            index = 0;
            for (var permit in pCode.table[frame]) {
                key = frame+'_'+pCode.table[frame][permit];
                pCode.framePermit[key] = index;
                index++;
            }
        }
    };
    pCode.collectFramePermit();

    //计算指定视图的制定权限的序号，based on 0
    pCode.getPermitPos = function(frame, permit) {
        var key = frame+'_'+permit;
        if(pCode.framePermit.hasOwnProperty(key))
            return pCode.framePermit[key];
        return -1;
    };

    //合并两个权限字符
    pCode.mergeChar = function(c1, c2){
        //先获取到基准字符的差距，在进行逻辑或运算，最后求出对应的新权限字符
        var stand = pCode.StandardCode.charCodeAt(0);
        var b1 = c1.charCodeAt(0) - stand;
        var b2 = c2.charCodeAt(0) - stand;
        b2 = b1 | b2;
        return String.fromCharCode(b2 + stand);
    };

    //合并两个权限字符串
    pCode.mergePermit = function(p1, p2){
        if(!p1) return p2;
        if(!p2) return p1;
        //保留长的权限，在其上进行修改
        var l1 = p1.length;
        var l2 = p2.length;
        var result = '';
        if(l1<l2) {
            //检查每一个字符，形成逻辑或的结果，再生成权限字符
            for(var i=0;i<l1;i++){
                result += pCode.mergeChar(p1.charAt(i), p2.charAt(i));
            }
            //多余的位数直接拷贝过去
            result += p2.substr(l1);
        }else{
            for(var i=0;i<l2;i++){
                result += pCode.mergeChar(p1.charAt(i), p2.charAt(i));
            }
            if(l1>l2)
                result += p1.substr(l2);
        }
        return result;
    };

    //合并两个路径权限
    //p3 = {supplier:{code:['yiyu']}, user:{name:['张三','李四']}};
    //p4 = {supplier:{code:['lhq'],name:['ywy']}, user:{code:['ftong'],name:['王武']}
    //    , log:{remark:['ddd']}};
    //pMerged2 = {supplier:{code:['yiyu','lhq'],name:['ywy']}
    //    , user:{code:['ftong'],name:['王武','张三','李四']}
    //    , log:{remark:['ddd']}};
    pCode.mergeProperty = function(p1, p2){
        for(var i in p2){
            if(!p1.hasOwnProperty(i))
                p1[i] = p2[i];
            else{
                for(var j in p2[i]){
                    if(p1[i].indexOf(p2[i][j])<0)
                        p1[i].push(p2[i][j]);
                }
            }
        }
        return p1;
    };
    pCode.mergePath = function(p1, p2){
        if(!p1) return p2;
        if(!p2) return p1;
        //遍历第二个路径的所有属性，如果第一个路径存在该属性，比较不同支出，如有必要增加属性
        //如果第一个路径不存在，则在第一个路径上增加
        for(var i in p2){
            if(!p1.hasOwnProperty(i))
                p1[i] = p2[i];
            else{
                p1[i] = pCode.mergeProperty(p1[i], p2[i]);
            }
        }
        return p1;
    };

    return pCode;
})();
