/**
 * 初始化数据库的增加权限和用户的操作，用于第一次初始化数据库
 * Created by Administrator on 2015/9/15.
 */
var config = require('../../config');
var mongoose = require('mongoose');
mongoose.connect(config.database);
var User = require('../models/user');
var bcrypt = require('bcrypt-nodejs');

var code = 'admin';
var pwd = '1yi.Pan';

bcrypt.hash(pwd, null, null, function (err, hash) {
    if (err) return console.log('bcrypt error: ', err);
    console.log('hashing from ', pwd, ' to ', hash);

    User.update({code:code}, {$set:{pwd:hash}}).exec(function(err){
        if(err){
            console.log('failed to update user with code : ', code, ' error = ', err);
            return;
        }
        console.log('updating user with code = ', code, ' pwd = ', pwd);
    });
});
// User.findOne({code:code}).select('pwd').exec(function (err, user)
// {
//     if(err){
//         console.log('failed to locate user with code : ', code, ' error = ', err);
//         return;
//     }
//     console.log('found user with code = ', code, ' pwd = ', user.pwd);
//     user.pwd = pwd;
//     user.update(function (err) {
//         if(err){
//             console.log('updating user failed: ', err);
//             return;
//         }
//         console.log('updating user success with code = ', code);
//         return;
//     });
// });

