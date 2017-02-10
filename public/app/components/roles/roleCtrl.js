//权限
angular.module('roleCtrl', ['pageService','baseService','permissionService'])
    .controller('roleController', ['Paginator', function (Paginator) {
        var vm = this;
        vm.paginator = Paginator;
        vm.paginator.reset();
        vm.paginator.entity.setEntity('roles');

        vm.paginator.customFilter = {
            code:{
                show:false
                ,type:'text'
                ,value:''
            }
            ,name:{
                show:false
                ,type:'text'
                ,value:''
            }
            ,remark:{
                show:false
                ,type:'text'
                ,value:''
            }
        };
        //记录排序的字段名称和方向
        //第一次按code的升序排列
        vm.paginator.sortColumn = 'code';
        //第一次加载全部数据，清空筛选字段也做同样的操作
        vm.paginator.refreshFilter();
    }])

    .controller('roleCreateController',['BaseService', 'Permission',  function (BaseService, Permission) {
        var vm        = this;
        vm.type       = 'create';
        vm.isSuccess  = true;
        vm.permission = Permission;
        vm.permission.init(0);

        vm.save = function (editForm) {
            vm.processing   = true;
            vm.message      = '';
            //权限集合转化成单独的数字，准备保存到数据库中
            vm.data.permits = vm.permission.toCode();

            BaseService.setEntity('roles');
            BaseService.create(vm.data).success(function (data) {
                vm.processing = false;
                vm.isSuccess  = (data.success?data.success:false);
                if(data.success) {
                    //如果成功插入记录，清空数据，并设置初始状态
                    vm.data = {};
                    editForm.$setPristine();
                }
                vm.message = BaseService.formatMessage(data);
            });
        };
    }])

    .controller('roleEditController',['$routeParams', 'BaseService', 'Permission',  function ($routeParams, BaseService, Permission) {
        var vm        = this;
        vm.type       = 'edit';
        vm.isSuccess  = true;
        vm.permission = Permission;
        BaseService.setEntity('roles');
        BaseService.get($routeParams.role_id).success(function (data) {
            vm.isSuccess = false;
            if(data.success && data.data){
                vm.isSuccess = true;
                vm.data      = data.data;
                if(vm.data)
                    vm.permission.init(vm.data.permits);
            }else{
                vm.message = data;
            }
        });

        vm.save = function () {
            vm.processing = true;
            vm.message    = '';

            //权限集合转化成单独的数字，准备保存到数据库中
            vm.data.permits = vm.permission.toCode();
            BaseService.update(vm.data).success(function (data) {
                vm.processing = false;
                vm.isSuccess  = (data.success?data.success:false);
                vm.message    = BaseService.formatMessage(data);
            });
        };
    }]);