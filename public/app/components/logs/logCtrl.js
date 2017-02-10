angular.module('logCtrl', ['baseService','pageService'])
    .controller('logController',['Paginator', 'BaseService', function (Paginator, BaseService) {
        var vm = this;
        vm.paginator = Paginator;
        vm.paginator.reset();

        BaseService.setEntity('users');
        BaseService.all().success(function (data) {
            vm.users = data;
        });

        /**
         * 将一个数组转化成键值对类型的对象，便于翻译时使用
         * @param array
         * @returns {{}}
         */
        vm.convertArray2Obj = function(array){
            var obj = {};
            for(var i= 0, len=array.length; i<len; i++){
                obj[array[i].name] = array[i].label;
            }
            return obj;
        };

        //由于path和method都是英文，这里需要翻译成中文供用户选择
        //这里需要准备两个格式的翻译数据，一种是数组，共select使用，一种是对象，供翻译时使用
        vm.paths = [
            {name:'/users/',label:'用户列表'},
            {name:'/users/s',label:'用户'},
            {name:'/roles/',label:'角色列表'},
            {name:'/roles/s',label:'角色'},
            {name:'/suppliers/',label:'供货商列表'},
            {name:'/suppliers/s',label:'供货商'},
            {name:'/logs/',label:'日志列表'},
            {name:'/logs/s',label:'日志'}
        ];
        vm.pathDic = vm.convertArray2Obj(vm.paths);
        vm.methods = [
            {name:'put',label:'修改'},
            {name:'post',label:'新增'},
            {name:'delete',label:'删除'},
            {name:'clear',label:'清空'}
        ];
        vm.methodDic = vm.convertArray2Obj(vm.methods);

        //重载格式化函数，用于在显示数据前的初始化工作
        vm.paginator.format = function(data){
            var len = 10;
            for(var i in data){
                data[i].pathLabel   = vm.pathDic[data[i].path];
                data[i].methodLabel = vm.methodDic[data[i].method];
                if(data[i].parameters) {
                    if(data[i].parameters.length>len)
                        data[i].para = data[i].parameters.substr(0, 10) + ' ...';
                    else
                        data[i].para = data[i].parameters;
                }
            }
            return data;
        };

        vm.paginator.entity.setEntity('logs');
        vm.paginator.customFilter = {
            user:{
                show:false
                ,type:'select'
                ,value:''
            }
            ,date:{
                show:false
                ,type:'date'
                ,value:'',value1:'',value2:'',value3:''
            }
            ,path:{
                show:false
                ,type:'select'
                ,value:''
            }
            ,method:{
                show:false
                ,type:'select'
                ,value:''
            }
            ,parameters:{
                show:false
                ,type:'text'
                ,value:''
            }
        };
        //记录排序的字段名称和方向
        //第一次按日期的降序排列排列
        vm.paginator.sortColumn = 'date';
        vm.paginator.sortDir    = -1;

        //清空动作需要用户确认
        vm.clear = function(){
            if(confirm('您确定清空所有日志信息吗？')){
                vm.paginator.clear();
            }
        };

        //第一次加载全部数据，清空筛选字段也做同样的操作
        vm.paginator.refreshFilter();
    }]);

