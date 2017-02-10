angular.module('signCtrl', ['baseService','pageService', 'utilsService'])
    //学生签到视图
    .controller('signStudentController', ['BaseService', '$http'
        , function (BaseService, $http) {
        var vm = this;
        vm.data = {};

        vm.filterKey = null;
        /** 用户定制的筛选函数 */
        vm.filter = function(record){
            if(vm.filterKey)
                return vm.filterKey.indexOf(record.status)>=0;
            else //无筛选条件，一律返回真
                return true;
        };

        vm.filtered = {
            signed:false,unsigned:false,agent:false,excuse:false
        };
        /** 修改当前的筛选条件 */
        vm.setFilter = function(key){
            if(key){
                if(key=='signed') vm.filtered.signed = !vm.filtered.signed;
                if(key=='unsigned') vm.filtered.unsigned = !vm.filtered.unsigned;
                if(key=='agent') vm.filtered.agent = !vm.filtered.agent;
                if(key=='excuse') vm.filtered.excuse = !vm.filtered.excuse;

                //重新组装筛选关键字
                vm.filterKey = '';
                if(vm.filtered.signed) vm.filterKey += '已签到|';
                if(vm.filtered.unsigned) vm.filterKey += '未签到|';
                if(vm.filtered.agent) vm.filterKey += '代签|';
                if(vm.filtered.excuse) vm.filterKey += '请假|';
                if(vm.filterKey.length<1) vm.filterKey = null;
            }else {
                vm.filterKey = null;
                vm.filtered = {
                    signed: false, unsigned: false, agent: false, excuse: false
                };
            }
        };

        vm.sortKey = '-create';
        //设置当前的排序条件
        vm.setSort = function(key){
            //如果以前的排序条件等于当前设置的，则选择降序排列，
            if(vm.sortKey.indexOf(key)==0) {
                vm.sortKey = '-' + key;
            }else
            //否则不管是原先是降序，还是更换了排序字段，都重新设置
                vm.sortKey = key;
        };

        //查询签到信息数据
        vm.setStatus = function(record){
            vm.isSuccess = false;
            vm.processing = true;
            vm.message = null;
            $http.put('/api/signs/' + record._id, {type: 'sign', remark:record.remark})
                .success(function (data) {
                    vm.processing = false;
                    if (data.success) {
                        vm.isSuccess = true;
                        record.status = '已签到';
                        record.date = Date.now();
                        vm.numReal ++;
                        vm.numAbsent --;
                    }else
                        vm.message = BaseService.formatMessage(data);
                });

        };

        //查询签到信息数据
        vm.refresh = function(){
            vm.isSuccess = false;
            vm.processing = true;
            vm.message = null;
            $http.get('/api/signstudent/')
                .success(function (data) {
                    vm.processing = false;
                    if (data.success) {
                        vm.isSuccess = true;
                        vm.data = data.data;

                        //完成统计信息，不依赖从数据库中获取的统计信息，那里可能不准
                        var numReal = 0;
                        var numAgent = 0;
                        var numExcuse = 0;
                        for(var i in vm.data){
                            if(vm.data[i].status == '已签到')
                                numReal ++;
                            else if(vm.data[i].status == '代签'){
                                numAgent ++;
                            }else if(vm.data[i].status == '请假')
                                numExcuse ++;
                        }

                        vm.numReal = numReal;
                        vm.numExcuse = numExcuse;
                        vm.numAgent = numAgent;
                        vm.numAbsent = vm.data.length - numReal - numExcuse - numAgent;
                    }else
                        vm.message = BaseService.formatMessage(data);
                });
        };
        vm.refresh();
    }])

    // 签到列表视图
    .controller('signController', ['Paginator', 'BaseService', 'UtilsService', '$http'
        , function (Paginator, BaseService, UtilsService, $http) {
        var vm = this;

        BaseService.setEntity('signgroups');
        BaseService.all().success(function (data) {
            vm.signgroups      = data;
        });

        /** 刷新单个签到记录的统计数据 */
        vm.refresh = function(record){
            vm.paginator.isSuccess = false;
            vm.paginator.message = null;
            $http.patch('/api/signs/' + record._id, {})
                .success(function (data) {
                    if (data && data.success) {
                        vm.paginator.isSuccess = true;
                        record.numReal = data.data.numReal;
                        record.numException = data.data.numException;
                        record.numAbsent = record.numExpected - record.numReal - record.numException;
                    }else
                        vm.paginator.message = BaseService.formatMessage(data);
                });
        };

        vm.paginator = Paginator;
        vm.paginator.reset();

        //获取数据后的处理动作
        vm.paginator.format = function(data){
                //自动计算缺席人数
                for (var i in data) {
                    data[i].numAbsent = data[i].numExpected - data[i].numReal - data[i].numException;
                }
                return data;
            };

        vm.paginator.entity.setEntity('signs');
        vm.paginator.customFilter = {
            name:{
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
        vm.paginator.sortColumn = 'create';
        vm.paginator.sortDir = -1;

        //第一次加载全部数据，清空筛选字段也做同样的操作
        vm.paginator.refreshFilter();

        vm.data = {};
        vm.saveMessage = null;

        //弹出新签到对话框
        vm.add = function(){
            $("#modalAdd").modal();
        };

        //修改签到对象，如果用户没有设定名称，则自定义一个签到名称
        vm.changeSignGroup = function(){
            if(!vm.data.name && vm.data.signgroup){
                var date = new Date();
                var dateString = UtilsService.formatDate(date, 'yyyy-MM-dd');
                vm.data.name = vm.data.signgroup.name + ' @ ' + dateString;
            }
        };

        //修改签到对象的状态
        vm.showHistory = function(history){
            vm.history = history;
            $("#modalHistory").modal();
        };

        //修改签到对象的状态
        vm.switch = function(record){
            vm.paginator.isSuccess = false;
            vm.paginator.message = null;
            $http.put('/api/signs/' + record._id, {type: 'status'})
                .success(function (data) {
                    if (data.success) {
                        vm.paginator.isSuccess = true;
                        record.isClosed = !record.isClosed;
                    }else
                        vm.paginator.message = BaseService.formatMessage(data);
                });
        };

        //完成新增数据，插入数据库
        vm.save = function(){
            vm.processing = true;
            vm.saveMessage = null;

            // use the create function in the userService
            BaseService.setEntity('signs');
            var newData = {};
            newData.name = vm.data.name;
            newData.signgroup = vm.data.signgroup._id;
            newData.pattern = vm.data.signgroup.pattern;
            newData.remark = vm.data.remark;
            BaseService.create(newData).success(function (data) {
                // 新增成功的后续动作，清空所有字段，并显示服务返回的信息
                vm.processing = false;
                vm.isSuccess  = (data.success?data.success:false);
                if(data.success) {
                    //如果成功插入记录，清空数据，并设置初始状态
                    vm.data      = {};
                    vm.paginator.refreshFilter();
                    $("#modalAdd").modal('hide');
                }else
                    vm.saveMessage = BaseService.formatMessage(data);
            });
        };
    }])

    // 给修改用户页面提供的控制器
    .controller('signEditController', ['$routeParams', 'BaseService', '$http', function ($routeParams, BaseService, $http) {
        var vm = this;

        /** 输出到打印台 */
        vm.print = function(){
          var len = vm.data.detail.length;
          var r;
          var status;
          console.log('序号\t代码\t姓名\t状态\t日期\tIP\t备注');
          for(var i=0; i<len; i++){
              r = vm.data.detail[i];
              status = r.status;
              if(r.status=='未签到') status = '未签';
              if(r.status=='已签到') status = '';
              console.log((i+1) + '\t'+r.name.code+'\t'+r.name.name+'\t'+status+'\t'+r.date+'\t'+r.ip+'\t'+r.remark);
          }
        };

        vm.itemId = $routeParams._id;
        BaseService.setEntity('signs');

        vm.filterKey = null;
        /** 用户定制的筛选函数 */
        vm.filter = function(record){
            if(vm.filterKey)
                return vm.filterKey.indexOf(record.status)>=0;
            else //无筛选条件，一律返回真
                return true;
        };

        vm.filtered = {
          signed:false,unsigned:false,agent:false,excuse:false
        };
        /** 修改当前的筛选条件 */
        vm.setFilter = function(key){
            if(key){
                if(key=='signed') vm.filtered.signed = !vm.filtered.signed;
                if(key=='unsigned') vm.filtered.unsigned = !vm.filtered.unsigned;
                if(key=='agent') vm.filtered.agent = !vm.filtered.agent;
                if(key=='excuse') vm.filtered.excuse = !vm.filtered.excuse;

                //重新组装筛选关键字
                vm.filterKey = '';
                if(vm.filtered.signed) vm.filterKey += '已签到|';
                if(vm.filtered.unsigned) vm.filterKey += '未签到|';
                if(vm.filtered.agent) vm.filterKey += '代签|';
                if(vm.filtered.excuse) vm.filterKey += '请假|';
                if(vm.filterKey.length<1) vm.filterKey = null;
            }else {
                vm.filterKey = null;
                vm.filtered = {
                    signed: false, unsigned: false, agent: false, excuse: false
                };
            }
        };

        /** 检查同一IP重复签到的情形
         * 检查方法如下：
         * 1. 扫描所有的签到明细，对IP不为空的记录下来，并记录IP出现的次数。
         * 2. 对IP出现次数大于1的记录，收集其学号姓名ID等信息
         * */
        vm.checkIP = function(){
            var ips = {};
            var ip = null;

            //扫描所有明细，记录IP出现的次数
            for(var i in vm.data.detail){
                ip = vm.data.detail[i].ip;
                if(ip){
                    if(ips[ip]){
                        ips[ip].push(vm.data.detail[i]);
                    }else
                        ips[ip] = [vm.data.detail[i]];
                }
            }

            //剔除次数为1的IP，仅留下次数大于1的IP序列对
            vm.ips = [];
            for(var i in ips){
                if(ips[i].length>1){
                    vm.ips.push({ip:i, detail:ips[i]});
                }
            }

            //显示对话框
            if(vm.ips.length>0)
                $("#modalIPs").modal();
            else
                alert('没有发现签到异常的现象');
        };

        /** 发现重名后，修改涉及的签到状态为代签*/
        vm.setAgent = function(record){
            var index = 0;
            var length = record.detail.length;
            async.whilst(
                function() {
                    return index<length;
                },function(cb) {
                    vm.setStatus(record.detail[index++], '代签', cb);
                },
                function(err) {
                    if(err) alert('批量修改遇到了错误：' + err);
                    alert('成功修改了' + length + '个状态为代签');
                }
            );
        };

        //刷新数据
        vm.refresh = function() {
            vm.isSuccess = true;
            vm.processing = true;
            BaseService.get(vm.itemId).success(function (data) {
                vm.processing = false;
                vm.isSuccess = false;
                if (data.success && data.data) {
                    vm.isSuccess = true;
                    vm.data = data.data;

                    //完成统计信息，不依赖从数据库中获取的统计信息，那里可能不准
                    var numReal = 0;
                    var numAgent = 0;
                    var numExcuse = 0;
                    for(var i in vm.data.detail){
                        if(vm.data.detail[i].status == '已签到')
                            numReal ++;
                        else if(vm.data.detail[i].status == '代签'){
                            numAgent ++;
                        }else if(vm.data.detail[i].status == '请假')
                            numExcuse ++;
                    }

                    vm.data.numReal = numReal;
                    vm.data.numExcuse = numExcuse;
                    vm.data.numAgent = numAgent;
                    vm.data.numAbsent = vm.data.numExpected - numReal - numExcuse - numAgent;

                } else {
                    vm.message = BaseService.formatMessage(data);
                }
            });
        };
        vm.refresh();

        //vm.viewType = 'list';
        vm.viewType = 'table';

        vm.sortKey = 'name.code';
        //设置当前的排序条件
        vm.setSort = function(key){
            //如果以前的排序条件等于当前设置的，则选择降序排列，
            if(vm.sortKey.indexOf(key)==0) {
                vm.sortKey = '-' + key;
            }else
                //否则不管是原先是降序，还是更换了排序字段，都重新设置
                vm.sortKey = key;
        };

        //默认不显示学生姓名
        vm.showDetailName = false;

        //更新单个记录的签到状态，并实时更新统计信息
        vm.updateStatus = function(record, neuStatus){
            if(record.status == neuStatus) return;

            //要根据旧状态来决定如何修改统计信息，
            if(record.status == '未签到')
                vm.data.numAbsent --;
            else if(record.status == '已签到')
                vm.data.numReal --;
            else if(record.status == '代签')
                vm.data.numAgent --;
            else if(record.status == '请假')
                vm.data.numExcuse --;
            if(neuStatus == '未签到')
                vm.data.numAbsent ++;
            else if(neuStatus == '已签到')
                vm.data.numReal ++;
            else if(neuStatus == '代签')
                vm.data.numAgent ++;
            else if(neuStatus == '请假')
                vm.data.numExcuse ++;

            record.ip = null;
            record.status = neuStatus;
        };

        // 更改某一个学生的签到状态
        vm.setStatus = function(record, status, callback){
            if(status){//指定了目标状态，肯定是在表格视图直接修改状态
                vm.isSuccess = false;
                vm.message = null;
                vm.processing = true;
                $http.put('/api/signs/' + vm.itemId, {type: 'exception', student: record._id, status: status, remark:record.remark})
                    .success(function (data) {
                        vm.processing = false;
                        if (data.success) {
                            vm.isSuccess = true;
                            vm.updateStatus(record,status);
                            if(callback)
                                callback(null);
                            else
                                $("#modalStatus").modal('hide');
                        }else {
                            vm.message = BaseService.formatMessage(data);
                            if(callback)
                                callback(vm.message);
                        }
                    });
            }else{//没有指定状态，肯定是在项目视图中选择了某一个用户
                vm.current = record;
                $("#modalStatus").modal();
            }
        };

        // 更改当前签到的状态
        vm.switch = function(){
            vm.isSuccess = false;
            vm.message = null;
            vm.processing = true;
            $http.put('/api/signs/' + vm.itemId, {type: 'status'})
                .success(function (data) {
                    vm.processing = false;
                    if (data.success) {
                        vm.isSuccess = true;
                        vm.data.isClosed = !vm.data.isClosed;
                    }else
                        vm.message = BaseService.formatMessage(data);
                });
        };

    }]);
