/** 文件（目录）对象 */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var Pinyin   = require('../libs/pinyin');

/**
 * 定义用户的表结构 files {
 *      name        对用户显示名，不含扩展名
 *      ,fname      真实文件名
 *      ,extension  扩展名
 *      ,size       文件大小，单位b
 *      ,mimetype   类型
 *
 *      ,encoding   编码
 *      ,path       绝对路径，用/分割每一层，不含文件名本身
 *      ,isFile     true 是文件，false是目录
 *      ,lastModified   最后修改时间，仅记录upload，replace，create三种操作的时间
 *      ,history:[{name,date,type,remark}] 修改历史，user是用户ID，date是修改时间，type操作类型，remark备注
 * }
 * @type {Schema}
 */
var HistorySchema = new Schema(
    {
        name: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
        ,date: {type: Date, default:Date.now()}
        ,type: {type: String, required: true}
        ,ip: {type: String}
        ,remark: {type: String}
    }
);
var FileSchema = new Schema({
    name: {type: String, required: true}
    ,fullname: {type: String}
    ,_p_name: {type: String, select: false}
    ,fname: {type: String}
    ,extension: {type: String}
    ,mimetype: {type: String}
    ,size: {type:Number, default:0}

    ,path: {type: String, required: true, index: true}
    ,_p_path: {type: String, select: false}
    ,encoding: {type: String}
    ,isFile:{type: Boolean, default:true}
    ,history:[HistorySchema]
    ,lastModified: {type: Date}
    ,isDelete:{type: Date, default:null}
});

FileSchema.pre('save', function (next) {
    var file = this;
    //确保扩展名是小写
    if(file.isFile) {
        if (file.isModified('extension'))
            file.extension = file.extension.toLowerCase();
        //记录文件的全名
        file.fullname = file.name + '.' + file.extension;
    }else
        file.fullname = file.name;

    if (file.isModified('name')) file._p_name = Pinyin.parse(file.name);
    if (file.isModified('path')) file._p_path = Pinyin.parse(file.path);

    //记录最近修改时间
    if (file.isModified('history')){
        //最近操作总是数组的第一个元素
        if('upload|replace|create|rename|cut|copy|move|paste'.indexOf(file.history[0].type)>-1){
            file.lastModified = file.history[0].date = Date.now();
        }
    }

    next();
});
module.exports = mongoose.model('File', FileSchema);