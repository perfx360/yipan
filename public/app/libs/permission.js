/**
 *
 * 拟建立一个Permission的服务，来为创建和修改角色，以及以后的权限认定来提供统一的
 接口，应包含以下的功能：
 1.  能解析和生成整形数字的权限字段，用于保存角色权限到数据库；
 2.  能描述权限之间的依赖关系，例如：修改->查看；
 3.  能根据权限数字判断是否具有某种权限。
 * Created by yy on 2015/6/20.
 */
angular.module('permissionService',['pCodeService'])
    .factory('Permission', ['PCode', function(PCode){
        //权限对象初始化为空
        var permissions = {};

        //当前的权限配置
        permissions.permits = {};

        //允许用户全选或者全不选，这里可以通过单击标签来触发这个事件
        //如果权限中有一个被选中，则视作全不选，否则视为全选
        permissions.selectAll = function(frame){
            //先判断是否有权限的值为真
            var hasTrue = false;
            for(var i in permissions.permits[frame]){
                if(permissions.permits[frame][i]){
                    hasTrue = true;
                    break;
                }
            }
            //全选或者全不选
            for(var i in permissions.permits[frame]){
                permissions.permits[frame][i] = !hasTrue;
            }
        };

        /** 定义权限的关联关系
        参数是权限关键字
        关联关系可以用正则表达式来实现：
         1.  查看模式是删除/修改/清空操作的前提：
             如果发现<frame>.view模式，则如果这个权限被取消，则相应的<frame>.delete/update/clear都要被取消；
         2.  删除/修改/清空操作被授权时，同时意味着查看权限：
             如果发现<frame>.delete/update/clear模式，则如果这个权限被授予，则相应的<frame>.view都要被授予；
         TODO 注意入库需要supplier,item的view权限
        */
        permissions.cascade = function(frame, permit){
            //是否是view的授权模式
            var frame;
            var key;
            if(permit == 'view'){
                //而且是取消授权
                if(!permissions.permits[frame][permit]){
                    //如果存在，则取消delete/update/clear的授权
                    key = 'delete';
                    if(permissions.permits.hasOwnProperty(frame,key))
                        permissions.permits[frame][key] = false;
                    key = 'update';
                    if(permissions.permits.hasOwnProperty(frame,key))
                        permissions.permits[frame][key] = false;
                    key = 'clear';
                    if(permissions.permits.hasOwnProperty(frame,key))
                        permissions.permits[frame][key] = false;
                }
                return;
            }
            var regView = /[delete|update|clear]/;
            if(permit.match(regView)){
                //而且是授权
                if(permissions.permits[frame][permit]){
                    //如果存在，则增加view的授权
                    key = 'view';
                    if(permissions.permits.hasOwnProperty(frame,key))
                        permissions.permits[frame][key] = true;
                }
                return;
            }
        };

        // 初始化，参数是字符串，每一位代表的一个视图的最多6中不同的权限
        // 例如0o 则第一位是基准字符，表示第一个视图没有任何权限，
        // 而第二位o与基准字符的差异正好是二进制的111111，表示拥有第二视图的全部权限
        permissions.init = function(pString){
            //清空原有数据
            permissions.permits = {};
            var s;
            var frame;
            //有时候会出现一些非字符串类型，可能是原来的老数据，这里统一先清空
            s = PCode.StandardChar;
            for (var i = 0, len = PCode.frame.length; i < len; i++) {
                frame = PCode.frameAt(i);
                if (frame)
                    permissions.permits[frame] = PCode.decode(frame, s);
            }

            if(pString && typeof(pString) == 'string') {
                //按顺序遍历现有的权限编码
                for (var i = 0, len = pString.length; i < len; i++) {
                    s = pString.charAt(i);
                    frame = PCode.frameAt(i);
                    if (frame)
                        permissions.permits[frame] = PCode.decode(frame, s);
                }
            }
        };

        //查看当前的权限是否具有特定的权限
        //参数是权限的关键字
        permissions.hasPermit = function(frame, permit){
            if(!frame || !permit) return false;
            if(permissions.permits[frame][permit])
                return true;
            else
                return false;
        };

        //将当前的权限转化成一个权限字符串，便于保存到数据库
        permissions.toCode = function(){
            var s = '';
            for (var i in permissions.permits) {
                if ( typeof ( permissions.permits[i]) != "function" ){
                    if(permissions.permits[i])
                        s += PCode.encode(i,permissions.permits[i]);
                }
            }
            return s;
        };
        return permissions;
    }]);