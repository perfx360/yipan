/**
 * 生成指定密码的加密式样，主要用于数据库初始化时，生成第一个用户用。
 * Created by Administrator on 2015/9/15.
 */

var bcrypt = require('bcrypt-nodejs');
var pwd = 'admin'; // hash = $2a$10$/35Kes9hrZ33sxvXojAqzOlar1gBHr/bcat7AuMyKzaKeApv4TJ5a
//var pwd = 'yi1Pan.'; // hash = $2a$10$/35Kes9hrZ33sxvXojAqzOlar1gBHr/bcat7AuMyKzaKeApv4TJ5a

bcrypt.hash(pwd, null, null, function (err, hash) {
    if (err) return console.log('error: ', err);

    console.log('hashing pwd = ', pwd);
    console.log('hashed pwd = ', hash);
});
