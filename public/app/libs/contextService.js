/**
 * 由于经常要涉及到页面之间的数据传递，这里设计一个通用的参数传递的服务类
 * 任何控制器都可以用它保存私有数据，如文件管理器在进入上传页面时，可以保存
 * 其当前目录到这里，而上传页面则可以读取这个变量。
 *
 * 注意：由于页面的跳转不具有绝对的逻辑(例如：直接修改地址栏就可以进入上传
 * 页面)，所以一般为了安全起见，跳转到指定页面后，指定页面应立即读取这个变量
 * 并清空变量，其他非逻辑跳转则可以通过检查这个变量的值来判断。
 * 这里提供了pop方法来获取某一个变量值并随即清空
 * Created by yy on 2015/6/22.
 */
angular.module('contextService',[])
    .factory('ContextService', function() {
        var context = {};

        /** 允许页面设置私有变量 */
        context.set = function(name, value){
            context[name] = value;
        };

        /** 允许页面读取私有变量*/
        context.get = function(name){
            return context[name];
        }

        /** 允许页面读取私有变量，并随即清空这个数据 */
        context.pop = function(name){
            var value = context[name];
            delete context[name];
            return value;
        }
        return context;
    });
