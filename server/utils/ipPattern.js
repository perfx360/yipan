/**
 * 测试IP的匹配模式，理想的设定模式是
 *  A   10.64.45.*          表示允许某一个机房的机器参加考试
 *  B   10.64.45.[1-100]    表示允许ip从10.64.45.1 到 10.64.45.100范围内100个IP参加考试
 *  准备先根据用户的设定形成一个字符匹配的正则表达式，然后在根据需要解析具体的ip数值
 *  来进行范围匹配。
 *
 * Created by Administrator on 2016/12/29.
 */
var utils        = require('../libs/utils');
var pattern = '10.64.45.*';
console.log('pattern = ', pattern);
var pattern2 = utils.formatIpPattern(pattern);
console.log('regexp = ', pattern2.source);

var ips = [
    '::ffff:10.64.63.122'
    ,'::ffff:110.64.63.122'
    ,'::ffff:210.64.63.122'
    , '::ffff:10.64.63.11'
    , '::ffff:10.64.63.151'
    , '::ffff:1000.64.63.151'
    ,'10.64.45.1'
    ,'110.64.45.1'
    ,'210.64.45.1'
    ,'10.604.45.1'
    ,'10.64.45.-1'
    ,'10.64.45.2'
    ,'10.64.45.3'
    ,'10.64.45.102'
];

console.log('ip\tmatched');
for(var i in ips){
    console.log(ips[i], '\t', utils.parseIP(ips[i],new RegExp(pattern2, 'g')));
}
console.log('done');
