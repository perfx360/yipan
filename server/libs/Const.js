/**
 * 项目中用到的常量列表
 */

module.exports = {
    //提示信息
    Msg : {
        Welcome: 'Guten Tag! Willkommen zu Yuyi\'s API fuer MEAN-Stack!',

        //通用信息
        NoCode      : '代码未指定',
        NoName      : '名称未指定',
        CodeNotExist  : '代码不存在',
        Duplicate   :   '代码已经存在，新增操作失败',
        AddOK       : '创建成功',
        DelOK       : '删除成功',
        UpdateOK    : '更新信息成功',
        CodeNotGiven: '代码未给定',
        NameNotGiven: '名称未给定',
        DelRelatedObj :'存在其他数据关联，不能删除这条记录',
        NotAuthenticated: '当前用户没有权限',
        NotSupported: '不支持的操作',
        User :{
            NoPWD       : '用户密码未指定',
            PwdMinLength : '用户密码至少4位',
            PwdWrong    : '密码错误',
            PwdNotEqual : '两次密码不一致',
            CodeMinLength : '用户代码至少2位',
            NameMinLength : '用户名称至少2位',
            LoginOK     : 'Enjoy your token',
            PwdNotGiven : '密码未给定',
            RoleNotGiven : '用户角色未给定'
        },
        Token :{
            Invalid     : '用户登录标记验证失败.',
            None        : '用户验证标记没有提供.',
            NotAllowed  : '用户不能进行此操作'
        }
    }
};