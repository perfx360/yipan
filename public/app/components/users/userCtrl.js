// 用户控制器，负责为angular提供数据模型
// 这里需要用到服务userService，所以在定义模型时把userService写到参数中
// 其它需要这个控制器的模型，需要引用userCtrl模型，然后才可以直接使用
// 诸如 userController 这样一些控制器，
// 实际上userCtrl定义了多个控制器
angular.module('userCtrl', ['angularFileUpload','baseService','pageService','utilsService'])
    //// 自定义输入验证函数，只要在Html中包含了<name>的属性、类等
    //// 就可以自动绑定这里定义的验证函数
    //// 注意这里函数名称采用驼峰写法，html可以采用-写法
    //// 即函数名若定义为 strongSecret, html中可以写为 strong-secret
    .directive('pwdRepeat', function () {
        return {
            //使用的限制，这里仅允许作为参数使用
            restrict: 'A',
            //需要同ngModalController一起使用
            require: 'ngModel',
            //验证函数，ctrl就是ngModalController，作为最后一个参数输入
            link: function (scope, element, attr, ctrl) {
                function customValidator(ngModelValue) {
                    //console.log('ngModalValue =', ngModelValue);
                    ////console.log('pwd =', ctrl.users.data.pwd);
                    //console.log('scope =');
                    //console.dir(scope);
                    //console.log('data.pwd =');
                    //console.dir(scope.$parent.user.data.pwd);
                    if (ngModelValue == scope.$parent.ctrl.data.pwd) {
                        ctrl.$setValidity('samePassword', true);
                    } else {
                        ctrl.$setValidity('samePassword', false);
                    }
                    return ngModelValue;
                }
                ctrl.$parsers.push(customValidator);
            }
        };
    })

    // 批量导入用户的控制器
    .controller('userImportController',['FileUploader', 'BaseService', 'UtilsService', function(FileUploader, BaseService, UtilsService){
        var vm       = this;
        var uploader = vm.uploader = new FileUploader();
        vm.users     = null;
        vm.role      = null;

        BaseService.setEntity('roles');
        BaseService.all()
            .success(function (data) {
                vm.roles = data;
            });
        vm.diskSize = '10M';

        //导入数据
        vm.import = function (editForm) {
            vm.progressTitle      = '导入用户';
            vm.isProcessing       = true;
            vm.progress           = 0;
            vm.progressTotal      = vm.users.length;
            vm.progressValue      = 0;
            vm.message            = null;
            vm.isSuccess          = true;
            var diskSizeFormatted = UtilsService.toFileSize(vm.diskSize);

            BaseService.setEntity('users');
            async.whilst(
                function () {
                    var len = vm.users.length;
                    if(len>0){
                        return true;
                    }else{
                        vm.isProcessing = false;
                        vm.message      = null;
                        vm.isSuccess    = true;
                        return false;
                    }
                },
                function (cb) {
                    //构造用户数据
                    var uData      = vm.users[0];
                    uData.role     = vm.role;
                    uData.diskSize = diskSizeFormatted;
                    BaseService.create(uData).success(function (data) {
                        // 新增成功的后续动作，清空所有字段，并显示服务返回的信息
                        if(data.success) {
                            vm.users.splice(0,1);
                            vm.progressValue ++;
                            vm.progress = (vm.progressValue / vm.progressTotal) * 100;
                            cb();
                        }else
                            cb(data.message);
                    });
                },
                function (err) {
                    vm.isProcessing = false;
                    if(err){
                        vm.isSuccess = false;
                        vm.message   = '批量导入用户失败：' + err;
                    }else{
                        vm.message   = '批量导入用户成功。';
                        vm.isSuccess = true;
                    }
                }
            );
        };

        //检查导入条件是否具备
        vm.validate = function(){
            if(!vm.role) return false;
            if(!vm.diskSize) return false;
            if(UtilsService.toFileSize(vm.diskSize) == null)
                return false;
            return true;
        };

        //删除用户
        vm.deleteUser = function(index){
            vm.message = null;
            vm.users.splice(index,1);
        };
        vm.deleteAll = function(){
            vm.message = null;
            vm.users   = null;
        };

        // FILTERS 文件类型筛选
        uploader.filters.push({
            name: 'txtFilter',
            fn: function(item, options) {
                var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                return '|plain|'.indexOf(type) !== -1;
            }
        });

        vm.message       = null;
        vm.isSuccess     = true;
        vm.isProgressing = false;
        vm.fileSize      = 0;
        vm.fileReaded    = 0;
        vm.progress      = 0;

        //新选择文件后进行解析工作
        uploader.onAfterAddingFile = function(fileItem) {
            var reader  = new FileReader();
            vm.fileSize = fileItem._file.size;
            if(vm.fileSize<=0) return;

            vm.progressTitle = '解析文件';
            vm.isProgressing = true;
            vm.progress      = 0;
            vm.fileReaded    = 0;
            vm.readUsers     = [];
            reader.readAsText(fileItem._file, 'UTF8');

            //加载过程中显示加载进度
            reader.onprogress = function(step){
                var lines       = step.target.result.split('\n');
                var names       = [];
                var isFirstLine = true;
                for(var i=0; i<lines.length; i++){
                    var us = lines[i].split('\t');
                    //至少需要提供3个用户信息才能导入
                    if(us && us.length>2){
                        if(isFirstLine){
                            names       = us;
                            isFirstLine = false;
                        }else {
                            var user = {};
                            user[names[0]] = us[0].replace(/(\n|\r|(\r\n)|(\u0085)|(\u2028)|(\u2029))/g, '').trim();
                            user[names[1]] = us[1].replace(/(\n|\r|(\r\n)|(\u0085)|(\u2028)|(\u2029))/g, '').trim();
                            user[names[2]] = us[2].replace(/(\n|\r|(\r\n)|(\u0085)|(\u2028)|(\u2029))/g, '').trim();

                            if (us.length > 3)
                                user.remark = us[3];
                            vm.readUsers.push(user);
                        }
                    }
                }

                //计算当前进度
                vm.fileReaded += step.loaded;
                vm.progress = (vm.fileReaded / vm.fileSize) * 100;
            };

            //全部读取完毕
            reader.onload = function(){
                //保存解析成功的记录到列表中
                //console.log(result.target.result);
                if(!vm.users && vm.readUsers.length>0) vm.users = [];
                vm.users         = vm.users.concat(vm.readUsers);
                vm.isProgressing = false;
                vm.isSuccess     = true;
                vm.message       = '成功解析文件：' + fileItem._file.name + '，导入 ' +  vm.readUsers.length + ' 条记录！';
                vm.readUsers     = null;
            };

            //读取文件错误的处理
            reader.onerror = function(e){
                vm.isProgressing = false;
                vm.isSuccess     = false;
                vm.message       = '解析文件 ' + fileItem._file.name + ' 失败：' + e;
            };
        };
        vm.uploader = uploader;
    }])

    // 用户列表控制器，主要用于用户列表页面时使用
    // 中间要用到服务中提供的对象User，这里作为参数传进来
    .controller('userController', ['Paginator', 'BaseService','UtilsService', function (Paginator, BaseService,UtilsService) {
        var vm = this;
        vm.paginator = Paginator;
        vm.paginator.reset();

        BaseService.setEntity('roles');
        BaseService.all().success(function (data) {
            vm.roles = data;
        });

        //重载格式化函数，用于在显示数据前的初始化工作
        vm.paginator.format = function(data){
            var rn;
            for(var i in data){
                //显示被授权的角色名称序列
                rn = '';
                if(data[i].role){
                    for(var j in data[i].role){
                        rn += ',' + data[i].role[j].name;
                    }
                }
                if(rn)
                    data[i].roleNames = rn.substr(1);

                //分配磁盘大小需要格式化成可显示字符串
                data[i].diskSizeB = UtilsService.toFileSizeWithUnit(data[i].diskSize);

                rn = '';
                if(data[i].marks){
                    for(var j in data[i].marks){
                        rn += data[i].marks[j].mark + ' | ';
                    }
                }
                if(rn)
                    data[i].marksString = rn;
            }
            return data;
        };

        vm.paginator.entity.setEntity('users');
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
            ,role:{
                show:false
                ,type:'select'
                ,value:''
            }
            ,remark:{
                show:false
                ,type:'text'
                ,value:''
            }
            ,diskSize:{
                show:false
                ,type:'number'
                ,value:0
            }
        };
        //记录排序的字段名称和方向
        //第一次按code的升序排列
        vm.paginator.sortColumn = 'code';

        //第一次加载全部数据，清空筛选字段也做同样的操作
        vm.paginator.refreshFilter();

        /** 输出到打印台 */
        vm.print = function(){
            var len = vm.paginator.data.length;
            var r;
            var status;
            console.log('序号\t代码\t姓名\t批注\t容量\t备注');
            for(var i=0; i<len; i++){
                r = vm.paginator.data[i];
                status = (r.marksString)?r.marksString:'';
                console.log((i+1) + '\t'+r.code+'\t'+r.name+'\t'+status+'\t'+r.diskSizeB+'\t'+r.ip+'\t'+r.remark);
            }
        };
    }])

    // 给修改用户页面提供的控制器
    .controller('userEditController', ['$routeParams', 'Auth', 'BaseService','UtilsService', function ($routeParams, Auth, BaseService, UtilsService) {
        var vm       = this;
        vm.isSuccess = true;
        vm.nowString = '刚刚';
        vm.processing = true;
        vm.changedMark = false;

        /** 这是三个视图公用的窗体，通过路由参数来区别：
         * _id    = 'create'    表示是新增用户
         * _id    = 'me'        表示是查看修改自身信息
         * _id    = '<ObjectId>'    表示是修改用户，其中ObjectId就是对象识别码
         * */
        if ($routeParams.user_id == 'create') {
            vm.type = 'create';
            vm.processing = false;
        } else if ($routeParams.user_id == 'me') {
            vm.type = 'me';
        } else {
            vm.type = 'edit';
        }

        if(vm.type != 'me') { //除了修改自身信息，都需要加载角色
            BaseService.setEntity('roles');
            BaseService.all().success(function (data) {
                vm.roles = data;
            });

            if(vm.type == 'edit') {
                BaseService.setEntity('users');
                BaseService.get($routeParams.user_id).success(function (data) {
                    vm.processing = false;
                    vm.isSuccess = false;
                    if (data.success && data.data) {
                        vm.isSuccess = true;
                        vm.data = data.data;
                        vm.data.diskSizeB = UtilsService.toFileSizeWithUnit(vm.data.diskSize);
                        vm.data.usedSizeB = UtilsService.toFileSizeWithUnit(vm.data.usedSize);
                        vm.data.procentSize = ((vm.data.usedSize / vm.data.diskSize) * 100).toFixed(0);
                        vm.data.sizeClass = UtilsService.getSizeClass(vm.data.diskSize, vm.data.usedSize);
                    } else {
                        vm.message = data;
                    }
                });
            }else{
                vm.pwdRepeat = '';
            }
        } else {
            BaseService.setEntity('users');
            BaseService.getMe(Auth, function (promise) {
                promise.then(function (data) {
                    //console.log(JSON.stringify(data));
                    vm.processing = false;
                    vm.isSuccess = data.data.success;
                    if (vm.isSuccess) {
                        vm.data = data.data.data;
                        vm.data.diskSizeB = UtilsService.toFileSizeWithUnit(vm.data.diskSize);
                        vm.data.usedSizeB = UtilsService.toFileSizeWithUnit(vm.data.usedSize);
                        vm.data.procentSize = ((vm.data.usedSize / vm.data.diskSize) * 100).toFixed(0);
                        vm.data.sizeClass = UtilsService.getSizeClass(vm.data.diskSize, vm.data.usedSize);
                    } else {
                        vm.message = data.data;
                    }
                });
            });
        };

        /**
         * 新增一条批注信息
         */
        vm.addMark = function () {
            if(!vm.data.marks)
                vm.data.marks = [];
            vm.data.marks.unshift({marker:Auth.user._id, date:vm.nowString, mark:''});
        };

        /**
         * 删除一条批注信息
         */
        vm.deleteMark = function (index) {
            vm.data.marks.splice(index,1);
            vm.changedMark = true;
        };

        /**
         * 修改一条批注信息
         */
        vm.changeMark = function (r) {
            //标注时间为"刚刚"
            r.date=vm.nowString;
            vm.changedMark = true;
        };

        /**
         * 保存用户信息到数据库
         */
        vm.save = function (editForm) {
            vm.processing    = true;
            vm.message       = '';
            //准备提交数据
            var data = {};
            //只有新建可以提交用户代号
            if(vm.type=='create') {
                if(!vm.data.code.match(/^(?!\.)[^\\\/:\*\?"<>\|]{1,255}$/)){
                    vm.isSuccess = false;
                    vm.message   = '用户代号含有非法字符';
                    vm.processing = false;
                    return;
                }
                data.code = vm.data.code;
            }else
                data._id = vm.data._id;

            //如果修改了一些数据，则加入提交数据中
            if(editForm.name.$dirty)
                data.name = vm.data.name;
            if(editForm.remark.$dirty)
                data.remark = vm.data.remark;
            if(editForm.pwd.$dirty)
                data.pwd = vm.data.pwd;
            if(vm.type != 'me' && editForm.diskSize.$dirty)
                data.diskSize = UtilsService.toFileSize(vm.data.diskSizeB);
            if(vm.type != 'me' && vm.data.code!='admin' && editForm.role.$dirty)
                data.role = vm.data.role;

            var now = Date.now();
            /** 准备提交批注数据
             * 1. 只有管理员修改其他用户或者创建用户时才能提交批注数据
             * 2. 批注提交时需要重新组织批注的数据，有两种情形：
             *      a. 有的批注没有修改，拷贝时间/批注人/时间，重新写回数据库
             *      b. 如果发现时间字段被修改成“刚刚”字样，说明被修改了，新建批注
             */
            if(vm.type != 'me' && vm.data.code!='admin' && vm.changedMark){
                var marks = [];

                if(vm.data.marks){
                    for(var i = 0; i<vm.data.marks.length; i++){
                        if(vm.data.marks[i].date == vm.nowString){
                            marks.push({marker:Auth.user._id, date: now, mark:vm.data.marks[i].mark});
                            vm.data.marks[i].date == now;
                        }else{
                            marks.push({marker:vm.data.marks[i].marker, date:vm.data.marks[i].date, mark:vm.data.marks[i].mark});
                        }
                    }
                }
                data.marks = marks;
            }

            BaseService.setEntity('users');
            if(vm.type == 'me' || vm.type == 'edit')
                BaseService.update(data).success(function (data) {
                    // 修改成功的后续动作， 清空所有字段，并显示服务返回的信息
                    vm.processing = false;
                    vm.changedMark = false;
                    vm.isSuccess  = (data.success?data.success:false);
                    vm.message    = BaseService.formatMessage(data);
                });
            else
                BaseService.create(data).success(function (data) {
                    // 修改成功的后续动作， 清空所有字段，并显示服务返回的信息
                    vm.processing = false;
                    vm.changedMark = false;
                    vm.isSuccess  = (data.success?data.success:false);

                    if(data.success) {
                        //如果成功插入记录，清空数据，并设置初始状态
                        vm.data      = {};
                        vm.pwdRepeat = '';
                        editForm.$setPristine();
                    }

                    vm.message    = BaseService.formatMessage(data);
                });
        };
    }]);
