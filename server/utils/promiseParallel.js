/**
 * Created by Administrator on 2016/3/23.
 */
//普通异步执行方法
var accounts = ['Checking Account', 'Travel Rewards Card', 'Big Box Retail Card'];
console.log('Updating balance information...');
accounts.forEach(function (account) {
    console.log(account + ' Balance: ');

});

//利用Promise执行异步
var requests = accounts.map(function (account) {
    console.log(account + ' Balance: ');
    Promise.resolve();
});
// Update status message once all requests are fulfilled
Promise.all(requests).then(function (balances) {
    console.log('All ' + balances.length + ' balances are up to date');
}).catch(function (error) {
    console.log('An error occurred while retrieving balance information');
    console.log(error);
});

//测试下随机数生成机制
//从指定长度的数组中随机获取若干个数
var getRandomIndex = function(total, toSelect){
    //先准备指定长度的整形数字数组
    var all = [];
    for(var i=0; i<total; i++)
        all.push(i);

    //连续取值若干次
    var selected = [];
    for(var i=0; i<toSelect; i++) {
        //根据现有长度随机获取一个索引
        var index = Math.floor((Math.random() * all.length));
        //将索引对应的元素插入目标集合
        selected.push(all[index]);
        //将它从候选集合中删除
        all.splice(index,1);
    }
    return selected;
};

console.log(getRandomIndex(12,5));
console.log(getRandomIndex(5,5));
console.log(getRandomIndex(34,2));
console.log(getRandomIndex(34,2));
console.log(getRandomIndex(34,2));
console.log(getRandomIndex(34,2));
console.log(getRandomIndex(34,2));