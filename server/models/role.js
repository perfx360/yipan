var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var Pinyin   = require('../libs/pinyin');

var stringLengthMin = function (string) {
    return string && string.length >= 2;
};

/**
 * 定义用户角色的表结构 code, name, permits
 * @type {Schema}
 */
var RoleSchema = new Schema({
    code: {type: String, required: true, index: {unique: true}
        , validate:[stringLengthMin, '代码长度最少2位']},
    name: {type: String, required: true
        , validate:[stringLengthMin, '名称长度最少2位']},
    _p_name: {type: String, select: false},
    remark: {type: String},
    _p_remark : {type: String, select: false},
    permits: {type: String},
    paths:{type: Schema.Types.Mixed}
});

RoleSchema.pre('save',function(next){
    var r       = this;
    r._p_name   = Pinyin.parse(r.name);
    r._p_remark = Pinyin.parse(r.remark);
    next();
});
module.exports = mongoose.model('Role', RoleSchema);