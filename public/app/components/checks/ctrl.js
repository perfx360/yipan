angular.module('checkCtrl', ['baseService','pageService', 'utilsService'])
    // 抽查列表视图
    .controller('checkController', ['Paginator', 'BaseService'
        , function (Paginator, BaseService) {
        var vm = this;

        BaseService.setEntity('signgroups');
        BaseService.all().success(function (data) {
            vm.signgroups      = data;
        });

        vm.paginator = Paginator;
        vm.paginator.reset();

        vm.paginator.entity.setEntity('checks');
        vm.paginator.customFilter = {
            create:{
                show:false
                ,type:'date'
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
        vm.paginator.sortColumn = 'create';
        vm.paginator.sortDir = -1;

        //第一次加载全部数据，清空筛选字段也做同样的操作
        vm.paginator.refreshFilter();
    }])

    // 给发起新抽查和查看抽查明细提供的控制器
    .controller('checkEditController', ['$interval', '$location', 'Auth', 'UtilsService', '$routeParams', 'BaseService', '$http'
        , function ($interval, $location, Auth, UtilsService, $routeParams, BaseService, $http) {
        var vm = this;

        //保存已经选择的签到对象Id
        vm.signgroupBackup = null;
        vm.isAccumulatedBackup = true;
        //排序
        vm.sortCol = 'code';
        /**
         * 指定排序字段和升降序
         */
         vm.setSort = function(col){
             var pos = vm.sortCol.indexOf(col);
             if(pos==1 || pos<0){//前面必然有负号或者新排序字段
                 vm.sortCol = col;
             }else{//第二次排序，则必然是改变为降序显示
                 vm.sortCol = '-' + col;
             }
         };

        if($routeParams.check_id == 'create'){
            vm._id = null;
            vm.type = 'create';
            vm.data = {isAccumulated:true, numExpected:5};
        }else{
            vm._id = $routeParams.check_id;
            vm.type = 'edit';

            BaseService.setEntity('checks');
            BaseService.get(vm._id).success(function (data) {
                if (data.success && data.data) {
                    vm.isSuccess = true;
                    vm.data = data.data;
                    //格式化以往的批注成一个字符串
                    for(var i in vm.data.detail){
                        vm.data.detail[i].marksString = vm.formatMark(vm.data.detail[i].marks);
                    }
                } else {
                    vm.message = JSON.stringify(data);
                }
            });
        }

        //抽取以往批注历史到一个字符串
        vm.formatMark = function(marks){
            var rn = '';
            if(marks){
                for(var j in marks){
                    rn += marks[j].mark + ' | ';
                }
            }
            return rn;
        }

        BaseService.setEntity('signgroups');
        BaseService.all().success(function (data) {
            vm.signgroups      = data;
        });

        //新增一个抽查学生
        vm.addDetail = function(){
            var name = prompt("请输入需要新增的学生代号","");
            if(name) {
                //首先不能是已经包含在抽查结果中的学生
                for (var i in vm.data.detail){
                    if (vm.data.detail[i].code == name) {
                        alert('该学生已经在抽查结果中！');
                        return;
                    }
                }

                //然后执行查询学生的请求，添加到data.detail中去
                $http.put('/api/checks/' + name, {})
                    .success(function (data) {
                        if(data && data.success){
                            if(!vm.data.detail)
                                vm.data.detail = [];
                            var user = data.data;
                            vm.data.detail.unshift({_id:user._id, code:user.code, name:user.name});
                        }else{
                            alert('新增学生失败：' + JSON.stringify(data));
                        }
                    });
            }
        };

        /** 保存本次抽查结果到数据库
         * 将抽中的学生ID集合，以及相应的批注信息发送到服务器，由服务器完成批量保存
         */
        vm.save = function(){
            if(vm.type == 'create') {
                vm.data.owner = Auth.user._id;
                // vm.data.create = Date.now();
                vm.data.numReal = vm.data.detail.length;
                if (vm.data.detail) {
                    vm.data.markPrefix = UtilsService.formatDate(new Date(), 'yyyy-MM-dd') + ' 抽查 ';
                    vm.data.marker = Auth.user._id;
                    $http.post('/api/checks', vm.data)
                    //发送一次新增抽查记录的请求
                        .success(function (data) {
                            if (data && data.success) {
                                //将当前页面的状态由新增变为查看刚刚新增的记录
                                $location.path('/checks/' + data._id);
                            } else {
                                alert('保存抽查结果失败：' + JSON.stringify(data));
                            }
                        });
                }
            }else{
                //修改时的保存仅仅是批注的新增
                //对每一个用户，新增一条批注信息
                var marker = Auth.user._id;
                var insertMark = vm.data.detail.map(function (detail) {
                    if(detail.mark) {
                        return $http.post('api/users/' + detail._id, {marker:marker,mark:detail.mark});
                    }else
                        return Promise.resolve();
                });
                Promise
                    .all(insertMark)
                    .then(function(){
                        // //一旦提交批注成功，将当前批注加入注释行，并清空
                        // for(var i in vm.data.detail){
                        //     if(vm.data.detail[i].mark) {
                        //         vm.data.detail[i].markString += ', ' + vm.data.detail[i].mark;
                        //         vm.data.detail[i].mark = null;
                        //     }
                        // }
                        alert('保存成功');
                        return Promise.resolve();
                    })
                    .catch(function(error){
                        alert('保存抽查批注失败' + JSON.stringify(error));
                    })
            }
        };

        //删除一个抽查学生
        vm.deleteDetail = function(r){
            if(confirm('确定删除：' + JSON.stringify(r))){
                for(var i in vm.data.detail){
                    if(vm.data.detail[i]._id == r._id){
                        vm.data.detail.splice(i, 1);
                        return;
                    }
                }
            }
        };

        //从指定长度的数组中随机获取若干个数
        vm.getRandomIndex = function(total, toSelect){
            //先准备指定长度的整形数字数组
            var all = [];
            for(var i=0; i<total; i++)
                all.push(i);

            //连续取值若干次
            var selected = [];
            for(var i=0; i<toSelect; i++) {
                //根据现有长度随机获取一个索引
                var index = 0;
                if(all.length>1) //只有数量超过1个才需要随机过程
                    index = Math.floor((Math.random() * all.length));
                //将索引对应的元素插入目标集合
                selected.push(all[index]);
                //将它从候选集合中删除
                all.splice(index,1);
            }
            return selected;
        };

        /** 在确定了候选名单后，完成一次抽查 */
        vm.checkOnce = function(){
            //如果候选个数刚刚好或者不足，则直接选取全部候选学生作为抽查结果
            var detail = [];
            if(vm.candidate.length<=vm.data.numExpected){
                for(var i in vm.candidate)
                    detail.push(vm.copy(vm.candidate[i]));
            }else{//执行随机选取过程
                var selected = vm.getRandomIndex(vm.candidate.length, vm.data.numExpected);
                for(var i in selected){
                    detail.push(vm.copy(vm.candidate[selected[i]]));
                }
            }
            $interval(function(){
                vm.data.detail = detail;
            },1,1);
        };

        /** 完成对象的复制 */
        vm.copy = function(obj){
            return JSON.parse(JSON.stringify(obj));
        };

        /** 完成抽查任务
         * 需要执行的动作有：
         * 1.   先查询数据库，取得此次参与抽查的学生名单
         * 2.   执行随机过程，抽取指定数量的学生名单
         * */
        vm.check = function(){
            //如果签到对象和是否累积没有发生变化，则只要重复随机过程即可。
            if(vm.data.signgroup == vm.signgroupBackup
                && vm.data.isAccumulated == vm.isAccumulatedBackup){
                vm.checkOnce();
                return;
            }

            //否则重新查询候选学生名单
            vm.signgroupBackup = vm.data.signgroup;
            vm.isAccumulatedBackup = vm.data.isAccumulated;
            Promise.resolve()
                .then(function(){
                    //1.   先查询数据库，取得此次参与抽查的学生名单
                    return $http.post('/api/checks/' + vm.data.signgroup, {isAccumulated:vm.data.isAccumulated});
                })
                .then(function(data){
                    //2.   执行随机过程，抽取指定数量的学生名单
                    if(data && data.data && data.data.success){
                        //保存所有候选学生名单
                        vm.candidate = data.data.candidate;

                        //执行抽查动作
                        vm.checkOnce();

                        return Promise.resolve();
                    }else{
                        return Promise.reject(data);
                    }
                })
                .catch(function(err){
                    if(err)
                        alert('抽取过程失败：' + JSON.stringify(err));
                });
        };
    }]);
