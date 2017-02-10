var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var bcrypt   = require('bcrypt-nodejs');
var Pinyin   = require('../libs/pinyin');

//服务器端验证：长度验证函数，如需要不同的长度验证需要定义不同的验证函数
var stringLengthMin = function (string) {
    return string && string.length >= 2;
};

/**
 * 批注历史信息，这里允许对当前用户标注历史信息
 **/
var Mark = new Schema(
    {
        //批注人，记录最后一次修改的批注人信息
        marker: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
        //批注时间，记录最后一次修改的批注人时间信息
        ,date: {type: Date, default:Date.now()}
        //批注信息
        ,mark: {type: String}
    }
);

/**
 * 定义用户的表结构 users [code, name, pwd, remark, role]
 * @type {Schema}
 */
var UserSchema = new Schema({
    //username是主键，不允许重复，在其上建立了索引
    code: {type: String, required: true, index: {unique: true}
        , validate:[stringLengthMin, '代码长度最少2位']},
    name: {type: String, required: true
        , validate:[stringLengthMin, '名称长度最少2位']},
    _p_name: {type: String, select: false},
    //密码不能为空，且通过find方法查询时不返回密码的值
    pwd: {type: String, required: true, select: false},
    remark: {type: String, required: false},
    _p_remark : {type: String, select: false},
    role: [{type: mongoose.Schema.Types.ObjectId, ref: 'Role'}],
    diskSize: {type: Number, default:0},
    usedSize: {type: Number, default:0},
    marks: [Mark]
});

/**
 * 在执行保存动作之前，先将用户密码进行哈希，保证存入数据库的不是明文
 */
UserSchema.pre('save', function (next) {
    var user = this;

    if (user.isModified('name')) user._p_name = Pinyin.parse(user.name);
    if (user.isModified('remark')) user._p_remark = Pinyin.parse(user.remark);
    if (user.isModified('pwd')) {
        bcrypt.hash(user.pwd, null, null, function (err, hash) {
            if (err) return next(err);
            user.pwd = hash;
            next();
        });
    }else{
        next();
    }
});

/**
 * 为结构增加一个比较密码是否相同的方法
 * @param password
 * @returns {*}
 */
UserSchema.methods.comparePassword = function (pwd) {
    var user = this;
    return bcrypt.compareSync(pwd, user.pwd);
};

/**
 * 准备输出语句格式，任何函数调用了require('user')就可以直接使用User作为一个用户对象来使用
 */
module.exports = mongoose.model('User', UserSchema);