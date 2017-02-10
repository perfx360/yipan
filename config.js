/**
 * 基本配置文件，这里相当于一个键值集合，任何一个通过require(<this js file>)
 * 的语句将获得这里定义的所有键值对信息
 */

module.exports = {
    'port': process.env.PORT || 28081
    ,'database': 'mongodb://admin:faton.Fan@127.0.0.1:27017/yipan'
    ,'secret': 'ArbeitMachtFreiSonstNichts'
    ,'uploadRemoveReplaced': true           //是否删除被覆盖和删除的文件，因为文件名是唯一的，这些文件完全可以保留
    ,'uploadDir': __dirname + '/public/uploads/'
    ,'exportDir': __dirname + '/public/exports/'
    ,'logDir': __dirname + '/logs/'
};