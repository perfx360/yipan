angular.module('sheetCtrl', ['baseService','pageService'])
    .controller('sheetController', ['$window','Paginator'
        , function ($window, Paginator) {
        var vm = this;
        vm.tableName = 'sheets';
        vm.paginator = Paginator;
        vm.paginator.reset();

        vm.paginator.entity.setEntity(vm.tableName);
        vm.paginator.customFilter = {
            name:{
                show:false
                ,type:'text'
                ,value:''
            }
            ,code:{
                show:false
                ,type:'text'
                ,value:''
            }
            ,lastModified:{
                show:false
                ,type:'date'
                ,value:new Date()
                ,value1:new Date()
                ,value2:new Date()
                ,value3:new Date()
            }
            ,remark:{
                show:false
                ,type:'text'
                ,value:''
            }
        };

        //记录排序的字段名称和方向
        vm.paginator.sortColumn = 'code';
        vm.paginator.sortDir = 1;
        var saved = $window.localStorage.getItem(vm.tableName + '.all.sortColumn');
        if(saved) vm.paginator.sortColumn = saved;
        saved = $window.localStorage.getItem(vm.tableName + '.all.sortDir');
        if(saved) vm.paginator.sortDir = saved;

        /** 排序 */
        vm.setSort = function(name){
            vm.paginator.sort(name);
            //保存用户最后的排序条件和方向
            $window.localStorage.setItem(vm.tableName + '.all.sortDir', vm.paginator.sortDir);
            $window.localStorage.setItem(vm.tableName + '.all.sortColumn', vm.paginator.sortColumn);
        };

        //第一次加载全部数据，清空筛选字段也做同样的操作
        vm.paginator.refreshFilter();
    }])

    // 给修改用户页面提供的控制器
    .controller('sheetEditController', ['$routeParams', 'BaseService', '$http', function ($routeParams, BaseService, $http) {
        var vm       = this;
        vm.tableName = 'sheets';
        vm.isSuccess = true;
        vm.itemId = null;
        vm.type = 'edit';
        vm.processing = true;

        /** 重置 */
        vm.reset = function(){
            if(vm.data.detail && vm.data.detail.length>0)
                if(confirm('确定删除所有组成明细，重新开始吗？'))
                    vm.data.detail=[];
        };

        vm.importData = null;
        /** 导入：显示数据库现有的各类属和类型的题目数量，供用户来选择种类，具体数量在修改视图中设置 */
        vm.showImport = function(){
            //先显示窗口
            $('#modalImport').modal();
            //再加载数据
            if(!vm.importData)
                vm.refresh();
        };

        vm.categorys = null;
        vm.processingImport = false;
        /** 从数据库查询试题库的类属和类型统计信息 */
        vm.refresh = function(){
            vm.processingImport = true;

            //先查询所有的类属明细信息，再做统计
            BaseService.setEntity('qcategorys');
            BaseService.all().success(function (data) {
                //为了快速查询，建立一个键值对结构
                vm.categorys = {};
                for(var i in data){
                    vm.categorys[data[i]._id] = data[i];
                }

                $http.get('/api/sheetop/')
                    .success(function (data) {
                        vm.processingImport = false;
                        if (data && data.success) {
                            //返回数据的格式是：{ _id:{category, type}, count }
                            //需要构造的目标格式是：{category:{name, _id}, type:{num,selected}}
                            //先用一个键值对保存所有的类属和对应类型和数量
                            var cmap = {};
                            var category = null;
                            for(var i in data.data){
                                category = data.data[i]._id.category;

                                if(!cmap[category])//不存在的键值，先创建它
                                    cmap[category] = {category:vm.categorys[category]};
                                //再新增一个类型和数量
                                cmap[category][data.data[i]._id.type] = {
                                    num:data.data[i].count
                                    , selected:false
                                };
                            }

                            //可否直接用对象来遍历？可以
                            vm.importData = cmap;
                        }else
                            alert('刷新试题库数据失败，' + JSON.stringify(data));
                    });
            });
        };

        vm.types = ['单选','多选'];
        /** 将用户的选择保存到试卷的组成明细中 */
        vm.import = function(){
            //遍历每一个类属的类别，看看用户是否选择了
            vm.data.detail = [];
            for(var i in vm.importData){
                for(var t in vm.types) {
                    if(vm.importData[i][vm.types[t]] && vm.importData[i][vm.types[t]].selected){
                        vm.data.detail.push({
                            category: vm.importData[i].category
                            , type: vm.types[t]
                            , num:vm.importData[i][vm.types[t]].num
                            , max:vm.importData[i][vm.types[t]].num
                        });
                    }
                }
            }
            vm.stat();
            $('#modalImport').modal('hide');
        };

        /** 统计各种类型的题数，显示成汇总字符串 */
        vm.stat = function(){
            //初始化统计数组
            var typeNum = {};
            for(var t in vm.types) {
                typeNum[vm.types[t]] = 0;
            }
            //扫描所有明细，计数
            var total = 0;
            for(var i in vm.data.detail){
                if(vm.data.detail[i].num) {
                    typeNum[vm.data.detail[i].type] += vm.data.detail[i].num;
                    total += vm.data.detail[i].num;
                }else{
                    total = -1;
                    break;
                }
            }

            if(total==-1){
                vm.statError = true;
                vm.statString = '指定题数超过了最大题数！';
            }else {
                //构造汇总字符串
                vm.statError = false;
                vm.statString = '';
                for (var t in vm.types) {
                    vm.statString += ',' + vm.types[t] + typeNum[vm.types[t]] + '个';
                }
                vm.statString = '共' + total + '题，其中' + vm.statString.substr(1) + '。';
            }
        };
        vm.statString = '';
        vm.statError = false;

        vm.sortKey = 'category.name';
        //设置当前的排序条件
        vm.setSort = function(key){
            //如果以前的排序条件等于当前设置的，则选择降序排列，
            if(vm.sortKey.indexOf(key)==0) {
                vm.sortKey = '-' + key;
            }else
            //否则不管是原先是降序，还是更换了排序字段，都重新设置
                vm.sortKey = key;
        };

        if($routeParams._id == 'create'){
            vm.type = 'create';
            vm.processing = false;
            vm.data = {};
        }else {
            vm.itemId = $routeParams._id;
            BaseService.setEntity(vm.tableName);
            BaseService.get(vm.itemId).success(function (data) {
                vm.processing = false;
                vm.isSuccess = false;
                if (data.success && data.data) {
                    vm.isSuccess = true;
                    vm.data = data.data[0];
                    vm.stat();
                } else {
                    vm.message = data;
                }
            });
        }

        /** 保存到数据库 */
        vm.save = function () {
            vm.processing    = true;
            vm.message       = '';
            BaseService.setEntity(vm.tableName);
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
