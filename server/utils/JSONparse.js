/**
 * 测试JSON parse功能
 * Created by Administrator on 2016/3/19.
 */
var a = {type: 'single',category: '3',form:[{desc: '1', ans:[{desc: 'answer1', isValid:true},{desc: 'a2'},{desc: 'a3'},{desc: 'a4'}]}]};

console.log('stringify: ', JSON.stringify(a));


//var string = '{"type": "single"}';
var string = '[{"type": "single","category": "3","form":[{"desc": "1", "ans":[{"desc": "answer1", "isValid":true},{"desc": "a2"},{"desc": "a3"},{"desc": "a4"}]}]}]';


var o = null;
try{
    o = JSON.parse(string);
    console.log('object: ', JSON.stringify(o));
}catch(e){
    console.log('error:', e);
}
