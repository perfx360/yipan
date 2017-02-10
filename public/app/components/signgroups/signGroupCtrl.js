angular.module('signGroupCtrl', ['baseService','pageService','utilsService'])
    // 用户列表控制器，主要用于用户列表页面时使用
    // 中间要用到服务中提供的对象User，这里作为参数传进来
    .controller('signGroupController', ['Paginator', 'BaseService','UtilsService', '$http'
        , function (Paginator, BaseService,UtilsService, $http) {
        var vm = this;
        vm.paginator = Paginator;
        vm.paginator.reset();

        vm.paginator.entity.setEntity('signgroups');
        vm.paginator.customFilter = {
            name:{
                show:false
                ,type:'text'
                ,value:''
            }
            ,pattern:{
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
        vm.paginator.sortColumn = 'name';

        //第一次加载全部数据，清空筛选字段也做同样的操作
        vm.paginator.refreshFilter();

        /** 查看给定的模式的指定应到人数 */
        vm.showInfo = function(record){
            var info = '\n' + JSON.stringify(record);

            if(record.pattern && record.pattern.trim().length>0)
                $http.patch('/api/signgroups/' + record._id,{pattern: record.pattern})
                    .success(function (data) {
                        if (data.success)
                            info = '应到人数 = ' + data.count + '人' + info;
                        else
                            info = BaseService.formatMessage(data) + info;
                        alert(info);
                    });
            else
                alert('非法模式字符串');
        };
    }])

    // 给修改用户页面提供的控制器
    .controller('signGroupEditController', ['$routeParams', 'BaseService','$http'
        , function ($routeParams, BaseService, $http) {
        var vm       = this;
        vm.isSuccess = true;
        vm.itemId = null;
        vm.type = 'edit';
        vm.processing = true;
        BaseService.setEntity('signgroups');

        /** 查看给定的模式的指定应到人数 */
        vm.showInfo = function(){
            var info = '\n' + JSON.stringify(vm.data);

            if(vm.data.pattern && vm.data.pattern.trim().length>0) {
                vm.data.pattern = vm.data.pattern.trim();
                $http.patch('/api/signgroups/pattern', {pattern: vm.data.pattern})
                    .success(function (data) {
                        if (data.success)
                            info = '应到人数 = ' + data.count + '人' + info;
                        else
                            info = BaseService.formatMessage(data) + info;
                        alert(info);
                    });
            }else
                alert('非法模式字符串');
        };

        if($routeParams._id == 'create'){
            vm.type = 'create';
            vm.processing = false;
        }else {
            vm.itemId = $routeParams._id;
            BaseService.get(vm.itemId).success(function (data) {
                vm.processing = false;
                vm.isSuccess = false;
                if (data.success && data.data) {
                    vm.isSuccess = true;
                    vm.data = data.data;
                } else {
                    vm.message = data;
                }
            });
        }

        /** 保存到数据库 */
        vm.save = function () {
            vm.processing    = true;
            vm.message       = '';

            if(vm.type == 'create'){
                BaseService.create(vm.data)
                    .success(function (data) {
                        // 新增成功的后续动作，清空所有字段，并显示服务返回的信息
                        vm.processing = false;
                        vm.isSuccess = (data.success ? data.success : false);
                        vm.message = BaseService.formatMessage(data);
                    });
            }else {
                BaseService.update(vm.data).success(function (data) {
                    // 修改成功的后续动作， 清空所有字段，并显示服务返回的信息
                    vm.processing = false;
                    vm.isSuccess = (data.success ? data.success : false);
                    vm.message = BaseService.formatMessage(data);
                });
            }
        };
    }]);
