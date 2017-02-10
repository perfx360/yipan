/**
 * 初始化数据库的增加权限和用户的操作，用于第一次初始化数据库
 * Created by Administrator on 2015/9/15.
 */
var config = require('../../config');
var mongoose = require('mongoose');
mongoose.connect(config.database);
var User = require('../models/user');
var Role = require('../models/role');

var role = new Role();
role.code = 'supervisor';
role.name = '所有权限';
role.remark = '最大的权限，可以做任何操作';
role.permits = '????';
role.save(function(err){
    if(err){
        console.log('saving role failed: ', err);
        return;
    }
    console.log('saving role success.');

    var user = new User();
    user.name = '管理员';
    user.code = 'admin';
    user.pwd = '$2a$10$/35Kes9hrZ33sxvXojAqzOlar1gBHr/bcat7AuMyKzaKeApv4TJ5a';
    user.role = role._id;
    user.remark = '系统管理员';
    user.save(function (err) {
        if(err){
            console.log('saving user failed: ', err);
            return;
        }
        console.log('saving user success.');
        return;
    });
});

