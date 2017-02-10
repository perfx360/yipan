angular.module('examCtrl', ['baseService','pageService','authService','utilsService', 'contextService'])
    // 用户列表控制器，主要用于用户列表页面时使用
    // 中间要用到服务中提供的对象User，这里作为参数传进来
    .controller('examController', ['BaseService', 'ContextService', 'Paginator', '$window', 'Auth', 'UtilsService', '$http', '$scope', function (BaseService, ContextService, Paginator, $window, Auth, UtilsService, $http, $scope) {
        var vm = this;
        vm.paginator = Paginator;
        vm.paginator.reset();

        vm.sortKey = '-tester.code';
        //设置当前的排序条件
        vm.setSort = function(key){
            //如果以前的排序条件等于当前设置的，则选择降序排列，
            if(vm.sortKey.indexOf(key)==0) {
                vm.sortKey = '-' + key;
            }else
            //否则不管是原先是降序，还是更换了排序字段，都重新设置
                vm.sortKey = key;
        };

        //加载所有的考试配置
        vm.configs = null;
        $http.get('/api/examconfigs')
            .success(function (data) {
                vm.configs = data;
            });
        //准备筛选的考试状态数组
        vm.configStatuss = ['考试中','已结束','未开始'];
        vm.submitStatuss = ['未交卷','已交卷，未判卷','已判卷'];
        vm.publicStatuss = ['已发布','未发布'];

        vm.paginator.entity.setEntity('exams');
        vm.paginator.showFilter = false;
        vm.paginator.customFilter = {
            config:{
                show:false
                ,type:'related'
                ,ids:[]
            }
            ,configStatus:{
                show:false
                ,type:'select'
                ,value:''
            },publicStatus:{
                show:false
                ,type:'select'
                ,value:''
            },submitStatus:{
                show:false
                ,type:'select'
                ,value:''
            },testerKey:{
                show:false
                ,type:'text'
                ,value:''
            },point:{
                show:false
                ,type:'number'
                ,value:0
                ,value2:100
            }
        };

        //检查是否是从考试配置页面跳转过来的
        var configValue = ContextService.pop('exams.config');
        if(configValue){
            vm.paginator.customFilter.config.show = true;
            vm.paginator.customFilter.config.ids = [configValue];
        }
        configValue = ContextService.pop('exams.student');
        if(configValue){
            vm.paginator.customFilter.testerKey.show = true;
            vm.paginator.customFilter.testerKey.value = configValue;
        }

        /** 分数的阀值必须合法 */
        vm.changePoint = function(isMax){
            if(isMax){
                if(vm.paginator.customFilter.point.value>vm.paginator.customFilter.point.value2)
                    vm.paginator.customFilter.point.value = vm.paginator.customFilter.point.value2;
            }else{
                if(vm.paginator.customFilter.point.value2<vm.paginator.customFilter.point.value)
                    vm.paginator.customFilter.point.value2 = vm.paginator.customFilter.point.value;
            }
        };

        //获取数据后的处理动作
        vm.paginator.format = function(data){
            /** 考试成绩状态共有6种情形：
             * 1.   已经提交，但是没有score字段，表示已提交，未判卷
             * 2.   已经提交，有score字段，表示已判卷，直接显示成绩
             * 3.   未提交，考试未开始，显示未提交，没有任何操作可能
             * 4.   未提交，考试已关闭，且没有缓存数据，显示未提交，没有任何操作可能
             * 5.   未提交，考试已关闭，且有缓存数据，显示未提交，可以执行补交的动作
             * 6.   未提交，考试正在进行，显示未提交，可以参加考试。
             * 这里主要是判断这六种情形，准备在scoreB字段显示的三种状态字符串，并记录后四种状态
             * 的不同之处，供视图来查询使用。
             * 后四种状态又进一步细分为三种可能：无操作，可补交，可参考，这里用两个布尔类型来区别
             * 即 canEnter 和 canSubmit
             */
            for(var i in data){
                data[i].canSubmit = false;
                if(!data[i].isSubmit && data[i].config.status == '已结束'){
                    //检查缓存是否有未提交的答案
                    if(UtilsService.hasStorage(
                            data[i].tester._id, data[i]._id
                        )){
                        data[i].canSubmit = true;
                    }
                }
            }
            return data;
        };

        //记录排序的字段名称和方向
        //第一次按code的升序排列
        vm.paginator.sortColumn = 'name';

        //只有管理员可以查看其它人的试卷，一般用户只能检索自己的已经发布的试卷
        if(Auth.user.code!='admin'){
            vm.paginator.extraFilter = {tester:Auth.user._id, isPublic:true};
        }

        //第一次加载全部数据，清空筛选字段也做同样的操作
        vm.paginator.refreshFilter();

        /**
         * 补交试卷的动作
         * 需要将缓存中的当前考试的答案提交到数据库
         * @param record
         */
        vm.submit = function(record){
            //构造提交数据库的答案格式
            var ans = UtilsService.getAnswers(Auth.user._id,record._id);
            //提交数据库
            $http.put('/api/exams/' + record._id, {ansSubmit: ans})
                .success(function (data) {
                    if (data.success) {
                        alert('提交试卷成功！');
                        vm.paginator.filter();
                        //清空本地缓存，不清空缓存，防止学生提交后没有答案
                        //UtilsService.submitStorage(Auth.user._id,record._id);
                        $scope.$apply();
                    }else
                        alert('提交试卷失败：' + BaseService.formatMessage(data));
                });
        };

        /**
         * 重新提交试卷的动作，这里主要抹去数据库中对应记录的已提交标记，从而是学生能够重新提交
         * @param record
         */
        vm.unsubmit = function(record){
            if(!confirm('重新提交将删除该用户已经提交的信息和分数，确定重新提交吗？')) return;

            //提交数据库
            $http.post('/api/exams/' + record._id, {isSubmit: false})
                .success(function (data) {
                    if (data.success) {
                        alert('成功设置试卷的状态为未提交，请通知学生重新提交试卷！');
                        record.isSubmit = false;
                    }else
                        alert('设置试卷的状态为未提交失败：' + BaseService.formatMessage(data));
                });
        };

        /** 批卷或者重新批卷 */
        vm.correct = function(record, isRecorrect){
            if(isRecorrect && !confirm('确定重新批卷吗？试卷将被重新批阅并打分！')) return;

            //提交数据库
            $http.put('/api/exams/' + record._id, {opType: 'correct'})
                .success(function (data) {
                    if (data.success) {
                        if(isRecorrect)
                            alert('重新批改试卷成功！');
                        else
                            alert('批改试卷成功！');
                    }else
                        alert('提交试卷失败：' + JSON.stringify(data));
                    $scope.$digest();
                });
        };

        /** 根据用户选择配置导出试卷列表数据*/
        vm.exportExams = function(){
            // 提交必要参数至服务器
            $http.put('/api/exportExams',{filter: vm.paginator.generateFilterCriteria(), user:{code:Auth.user.code, _id:Auth.user._id}})
                .success(function(data){
                    if(data.success && data.data){
                        // 服务器实际文件名
                        vm.exportFile = data.data.name + '.txt';
                        // 本地默认考试名+日期为文件名
                        var date = new Date(data.data.name);
                        var y = date.getFullYear();
                        var m = date.getMonth()+1;
                        var d = date.getDate();

                        // 弹出保存文件窗口
                        var link = document.createElement("a");
                        link.href = 'public/exports/' + vm.exportFile;
                        link.download = y+'-'+m+'-'+d+'.txt';
                        link.target = '_self';
                        link.click();
                    }else {
                        alert('导出失败!');
                    }
                });
        };
    }])

    // 给修改用户页面提供的控制器
    .controller('examEditController',
        ['$routeParams', 'BaseService', '$location', '$http', '$interval', '$scope', '$window', 'UtilsService', 'Auth'
            , function ($routeParams, BaseService, $location, $http, $interval, $scope, $window, UtilsService, Auth) {
        var vm       = this;
        vm.isSuccess = true;
        vm.itemId = null;
        vm.type = 'view';
        vm.processing = true;

        /** 打开图片预览对话框 */
        vm.showImage = function(item){
            var image = new Image();
            vm.image = null;
            image.src = 'public/uploads/' + item;

            //通过html的2D画面显示图片，并实现手动缩放
            var canvas = document.getElementById("canvas");
            var context = canvas.getContext("2d");
            //手动缩放条
            var slider = document.getElementById("scale-range");

            //初始比例100%
            var scale = 1.0;

            image.onload = function(){
                //适配画布和图片尺寸
                //小图直接显示
                if(image.width <= 570 && image.height <= 320){
                    $("#modalShowImage").modal();
                }
                //大图可缩放
                else{
                    canvas.width = 550;
                    canvas.height = image.height/(image.width/550);
                    //重新点击，重置缩放比例
                    slider.value = 1.0;
                    scale = 1.0;
                    drawImage( image , scale );
                    //拉动滑动条，手动改变缩放大小
                    slider.onmousemove = function(){
                        scale = slider.value;
                        drawImage( image , scale );
                    };
                    $("#modalShowImage").modal();
                }
            };
            //通过canvas大小实现缩放
            var drawImage = function(image , scale){
                var imageWidth = canvas.width * scale;
                var imageHeight = canvas.height * scale;
                var x = canvas.width /2 - imageWidth / 2;
                var y = canvas.height / 2 - imageHeight / 2;
                context.clearRect( 0 , 0 , canvas.width , canvas.height );
                context.drawImage( image , x , y , imageWidth , imageHeight );
            };
        };

        //用户选择答案自动跳转并标记已经答题
        vm.answer = function(index){
            var target = false;
            var answers = [];
            if(vm.current.type == '多选') {
                //检查是否至少有一个选项选中了
                for (var i in vm.current.question.ans) {
                    if (vm.current.question.ans[i].isSelected) {
                        target = true;
                        answers.push(i);
                    }
                }
                if(vm.current.question.hasAnswered == target){
                    //是否答题的状态没有改变
                }else{ //改变了答题状态，更新统计信息
                    if(target){
                        vm.stat[vm.current.type].num ++;
                    }else{
                        vm.stat[vm.current.type].num --;
                    }
                    vm.current.question.hasAnswered = target;
                }
                //将单个答案保存到本地磁盘
                $window.localStorage.setItem(UtilsService.getStorageKey(Auth.user._id, vm.data._id, vm.current.question.qid), answers);
            }else if(vm.current.type == '单选'){
                //改变了答题状态，更新统计信息
                if(!vm.current.question.hasAnswered)
                    vm.stat[vm.current.type].num ++;
                vm.current.question.hasAnswered = true;
                //取消所有的其他选项，并强制设定当前项为选中
                for (var i in vm.current.question.ans) {
                    if (i == index) {
                        vm.current.question.ans[i].isSelected = true;
                    }else{
                        vm.current.question.ans[i].isSelected = false;
                    }
                }
                answers.push(index);
                //将单个答案保存到本地磁盘
                $window.localStorage.setItem(UtilsService.getStorageKey(Auth.user._id, vm.data._id, vm.current.question.qid), answers);
                //用户在单选模式下，如果选择了自动跳转，则答题后立即跳转到下一道题
                if(vm.autoGoto)
                    vm.goto(1);
            }
        };

        //单选题中是否答题后自动跳转到下一道题目
        vm.setAutoGoto = function(isAuto){
            vm.autoGoto = isAuto;
            //保存到缓存中
            $window.localStorage.setItem(UtilsService.getStorageKey(Auth.user._id, vm.data._id, 'auto'), isAuto);
        };

        /**
         * 显示某一道指定的习题
         */
        vm.showQuestion = function(index){
            vm.current.index = index;
            vm.current.question = vm.questions[vm.current.type][index];
            //$scope.$apply();
            //保存到缓存中
            $window.localStorage.setItem(UtilsService.getStorageKey(Auth.user._id, vm.data._id, 'index'), index);
        };
        vm.showType = function(type){
            vm.current.type = type;
            vm.current.index = 0;
            vm.current.question = vm.questions[vm.current.type][0];
            $window.localStorage.setItem(UtilsService.getStorageKey(Auth.user._id, vm.data._id, 'index'), 0);
            $window.localStorage.setItem(UtilsService.getStorageKey(Auth.user._id, vm.data._id, 'type'), type);
        };

        //试题导航，前往下一个或者上一个试题
        vm.goto = function(dir){
            if(dir==-1) {
                if(vm.current.index>0) {
                    vm.current.index--;
                    vm.current.question = vm.questions[vm.current.type][vm.current.index];
                }
            }else if(dir==1){
                if((vm.current.index+1)<vm.stat[vm.current.type].total) {
                    vm.current.index++;
                    vm.current.question = vm.questions[vm.current.type][vm.current.index];
                }
            }
        };

        //获取试题的ID号和当前试卷模式
        BaseService.setEntity('exams');
        if($routeParams._id.indexOf('view_')==0) {
            vm.type = 'view';
            vm.itemId = $routeParams._id.substr(5);
        }else{
            vm.type = 'test';
            vm.itemId = $routeParams._id;
        }
        //加载试卷信息，分为两步，首先加载试卷内容，再获取服务器时间，从而决定剩余考试时间，并开始倒计时
        Promise.resolve()
            .then(function(){//加载试卷信息
                return $http.patch('/api/exams/' + vm.itemId, {type: vm.type});
            })
            .then(function(data){ //格式化试卷信息
                if (data.data && data.data.success) {
                    vm.data = data.data.data;
                    vm.questions = vm.format(data.data.data);
                    if(!vm.current.type)
                        vm.current.type = vm.types[0];
                    if(vm.current.index<0)
                        vm.current.index=0;
                    vm.current.question = vm.questions[vm.current.type][vm.current.index];

                    //进一步查询服务器时间
                    if(vm.type == 'test' && vm.data.config.status == '考试中') {
                        return $http.get('/api/systemdate');
                    }else
                        return Promise.resolve();
                } else {
                    return Promise.reject(data);
                }
            })
            .then(function(data){
                vm.processing = false;
                if(data) {
                    vm.isSuccess = false;
                    if (data.data && data.data.success) {
                        vm.isSuccess = true;
                        /** 根据系统当前时间和考试结束时间计算剩余的秒数 */
                        vm.restTime = parseInt((new Date(vm.data.config.dateEnd) - new Date(data.data.date)) / 1000);

                        vm.formatTime();
                        if(!isNaN(vm.restTime)) {
                            //开启倒计时时钟，每隔5秒更新一次
                            vm.timer = $interval(function () {
                                vm.restTime -= 5;
                                if (vm.restTime < 60) {
                                    //倒计时1分钟时，采用下一个倒计时钟
                                    vm.timer3 = $interval(function () {
                                        vm.restTime -= 1;
                                        if (vm.restTime < 1) {
                                            //倒计时结束后，自动提交试卷
                                            $interval.cancel(vm.timer3);
                                            vm.submit(true);
                                        }else
                                            vm.formatTime();
                                    }, 1000);
                                    $interval.cancel(vm.timer);
                                } else {
                                    vm.formatTime();
                                }
                            }, 5000);
                        }

                        return Promise.resolve();
                    } else {
                        return Promise.reject(JSON.stringify(data));
                    }
                }else{ //无数据，必然是查看模式
                    vm.isSuccess = true;
                    return Promise.resolve();
                }
            })
            .then(function(){
                $scope.$digest();
            })
            .catch(function(error){
                $interval(function () {
                    vm.type = 'view';
                }, 1, 1);
                if(error){
                    if(error.data && error.data.message)
                        alert('错误：' + JSON.stringify(error.data.message));
                    else
                        alert('错误：' + JSON.stringify(error));
                }else
                    alert('错误：未知错误');
            })
        ;

        /**
         * 格式化时间字符串，先获取剩余分钟数，如果大于3分钟，则显示“3.6分钟”的格式
         * 小于3分钟，则显示“2分钟19秒”的格式，并且变换提交按钮的背景式样。
         */
        vm.formatTime = function(){
            //先求分钟数，并保留小数点后一位
            var minute = (vm.restTime / 60).toFixed(1);
            if(minute>3){
                vm.restTimeString = parseInt(minute) + '分钟';
            }else{
                if(minute<1)
                    vm.restTimeString = '最后' + (vm.restTime % 60) + '秒';
                else
                    vm.restTimeString = minute + '分钟';
                vm.isLastMinutes = !vm.isLastMinutes;
            }
        };
        vm.isLastMinutes = false;

        //默认显示单选第一题
        vm.current = {type:null,index:-1};
        vm.autoGoto = true;
        //如果缓存中有数据，则读取这个数据
        var savedValue = $window.localStorage.getItem(UtilsService.getStorageKey(Auth.user._id, vm.itemId, 'auto'));
        if(savedValue === 'false')
            vm.autoGoto = false;
        savedValue = $window.localStorage.getItem(UtilsService.getStorageKey(Auth.user._id, vm.itemId, 'index'));
        if(savedValue)
            vm.current.index = parseInt(savedValue);
        savedValue = $window.localStorage.getItem(UtilsService.getStorageKey(Auth.user._id, vm.itemId, 'type'));
        if(savedValue)
            vm.current.type = savedValue;
        vm.stat = {};

        /**
         * 提交考试答案
         */
        vm.submit = function(isAutoSubmit){
            if(!isAutoSubmit){
                //主动交卷
                //检查是否有未回答的题目
                for(var i in vm.types){
                    if(vm.stat[vm.types[i]].num<vm.stat[vm.types[i]].total){
                        if(!confirm('还有未回答的题目，确定交卷吗？')) return;
                        break;
                    }
                }

                if(!confirm('确定交卷吗？交卷后不能再修改试卷！')) return;
            }

            vm.isSubmitting = true;
            //先获取用户的最终选择
            var answers = vm.getAnswers();
            //在转成数据库能存储的格式
            var ans = [];
            for(var key in answers){
                ans.push({qid: key, ans: answers[key]});
            }

            //提交数据库
            $http.put('/api/exams/' + vm.data._id, {ansSubmit: ans})
                .success(function (data) {
                    vm.isSubmitting = false;
                    if (data.success) {
                        alert('提交试卷成功！');
                        //清空本地缓存
                        //UtilsService.submitStorage(Auth.user._id,vm.data._id);
                        //退回到考试列表页面
                        $location.path('/exams');
                    }else
                        alert('提交试卷失败：' + BaseService.formatMessage(data));
                });
        };
        vm.isSubmitting = false;

        /** 读取用户的答案数组，记录哪些值是选中的 */
        vm.getIndices = function(ans){
            var selected = [];
            for(var i=0; i<ans.length; i++){
                if(ans[i].isSelected)
                    selected.push(i);
            }
            return selected;
        };

        /** 将用户的答案转成{questionid : [index]} 的结构 */
        vm.getAnswers = function(){
            var answers = {};
            for(var t in vm.questions){
                for(var i in vm.questions[t]){
                    answers[vm.questions[t][i].qid] = vm.getIndices(vm.questions[t][i].ans);
                }
            }
            return answers;
        };

        /** 两种显示式样，
         * 考试模式下：   是否已经作答会影响试题号的样式
         * 阅卷模式下：   是否回答正确会影响试题号的样式
         */
        vm.class = (vm.type == 'test')?
        {   true:{true:'btn btn-lg btn-info',false:'btn btn-lg btn-default'},
            false:{true:'btn btn-xs btn-info',false:'btn btn-xs btn-default'}
        }:{
            true:{true:'btn btn-lg btn-danger',false:'btn btn-lg btn-success'},
            false:{true:'btn btn-xs btn-danger',false:'btn btn-xs btn-success'}
        };

        //提交按钮的样式，在最后几分钟交替变换，提醒考生注意即将自动提交试卷
        vm.submitClass = {true: 'btn btn-danger', false: 'btn btn-success'};

        /** 重新组织试题的排列形式，按类型为键值来存储试题
         * 按类型统计试题的数量，为每个试题新增索引、是否已经答题两个字段
         * 为每个答案新增一个是否选择的字段
         * 由于是否已经答题默认为空，可以不初始化
         * 但是答案需要重新构造数据结构，原来是字符串数组，现在要成为对象数组
         **/
        vm.format = function(exam){
            var f = {};
            var num;
            var isAnswered;

            /**
             * 如果是考试，可能会刷新页面，这时需要提取缓存中保存的未提交的答案
             * 同样的情况也出现在考试时没有提交页面，而是关闭了页面，重新进入后发现考试已经结束，可以选择补交
             * 后一种情形也是要从缓存中提取未提交的答案。
             * 缓存管理：
             *      修改缓存    由用户点击答案来修改
             *      提交/删除缓存    主动提交、自动提交、补交
             *      删除缓存    其他用户重新登录，注意如果用户自己重新登录并不清除缓存。
             */
            //题型数组，应包含所有的题型
            vm.types = [];
            if(vm.type == 'test') {
                var hasSavedAnswer = UtilsService.hasStorage(Auth.user._id, vm.data._id);
                for (var i = 0; i < exam.questions.length; i++) {
                    if(vm.types.indexOf(exam.questions[i].type)<0){
                        vm.types.push(exam.questions[i].type);
                    }
                    //按类型为键值来存储试题
                    f[exam.questions[i].type] = exam.questions[i].questions;
                    num = 0;

                    //遍历每一个试题，新增索引字段
                    for (var j = 0; j < f[exam.questions[i].type].length; j++) {
                        f[exam.questions[i].type][j].index = j;
                        //f[exam.questions[i].type][j].question.desc = $sce.trustAsHtml(f[exam.questions[i].type][j].question.desc);
                        isAnswered = false;

                        //重构答案数组
                        var answers = [];
                        //答案从A开始自动编号
                        if (hasSavedAnswer) {//有缓存，则需要检查缓存保存的答案
                            //读取缓存里面保存的答案数组
                            var saved = $window.localStorage.getItem(UtilsService.getStorageKey(
                                Auth.user._id, vm.data._id, f[exam.questions[i].type][j].qid));
                            for (var k = 0; k < f[exam.questions[i].type][j].ans.length; k++) {
                                //有保存的试题，并且是该索引是被记录的，则表示该答案用户已经选择
                                if (saved && saved.indexOf(k) > -1) {
                                    isAnswered = true;
                                    answers.push({
                                        isSelected: true,
                                        desc: String.fromCharCode(65 + k) + '. ' + f[exam.questions[i].type][j].ans[k]
                                    });
                                }
                                else
                                    answers.push({
                                        isSelected: false,
                                        desc: String.fromCharCode(65 + k) + '. ' + f[exam.questions[i].type][j].ans[k]
                                    });
                            }
                        } else {
                            for (var k = 0; k < f[exam.questions[i].type][j].ans.length; k++) {
                                answers.push({
                                    isSelected: false,
                                    desc: String.fromCharCode(65 + k) + '. ' + f[exam.questions[i].type][j].ans[k]
                                });
                            }
                        }
                        f[exam.questions[i].type][j].ans = answers;

                        //是否已经答题的统计信息
                        if (isAnswered) num++;
                        f[exam.questions[i].type][j].hasAnswered = isAnswered;
                    }
                    //每种类型的总题量和已经答题的数量
                    vm.stat[exam.questions[i].type] = {num: num, total: exam.questions[i].questions.length};
                }
            }else if(vm.type == 'view'){ //查看试卷，需要加载考生的选择和参考答案
                var isSelected = false;
                var isExpected = false;

                /**
                 * 将查询数据的答案按qid为键值重新组织
                 */
                var savedSubmit = null;
                if(vm.data.hasOwnProperty('ansSubmit') && vm.data.ansSubmit && vm.data.ansSubmit.length>0){
                    savedSubmit = {};
                    for(var i =0; i<vm.data.ansSubmit.length; i++)
                        savedSubmit[vm.data.ansSubmit[i].qid] = vm.data.ansSubmit[i].ans;
                }
                var savedExpect = null;
                if(vm.data.hasOwnProperty('ansExpect') && vm.data.ansExpect && vm.data.ansExpect.length>0){
                    savedExpect = {};
                    for(var i =0; i<vm.data.ansExpect.length; i++)
                        savedExpect[vm.data.ansExpect[i].qid] = vm.data.ansExpect[i].ans;
                }
                var isWrong = false;
                for (var i = 0; i < exam.questions.length; i++) {
                    if(vm.types.indexOf(exam.questions[i].type)<0){
                        vm.types.push(exam.questions[i].type);
                    }
                    //按类型为键值来存储试题
                    f[exam.questions[i].type] = exam.questions[i].questions;
                    num = 0;

                    //遍历每一个试题，新增索引字段
                    for (var j = 0; j < f[exam.questions[i].type].length; j++) {
                        f[exam.questions[i].type][j].index = j;
                        isAnswered = false;

                        //重构答案数组
                        var answers = [];
                        //答案从A开始自动编号
                        //读取缓存里面保存的答案数组
                        var ansSubmit = null;
                        if(savedSubmit) ansSubmit = savedSubmit[f[exam.questions[i].type][j].qid];
                        var ansExpect = null;
                        if(savedExpect) ansExpect = savedExpect[f[exam.questions[i].type][j].qid];

                        isWrong = false;
                        for (var k = 0; k < f[exam.questions[i].type][j].ans.length; k++) {
                            isSelected = false;
                            isExpected = false;
                            //有保存的试题，并且是该索引是被记录的，则表示该答案用户已经选择
                            if (ansSubmit && ansSubmit.indexOf(k) > -1) {
                                isAnswered = true;
                                isSelected = true;
                            }
                            if (ansExpect && ansExpect.indexOf(k) > -1) {
                                isExpected = true;
                            }
                            //增加一个表示是否有错的标记，便于前端能用不同样式标记是否回答错误
                            answers.push({
                                isSelected: isSelected,
                                isExpected: isExpected,
                                isWrong: (isExpected != isSelected),
                                desc: String.fromCharCode(65 + k) + '. ' + f[exam.questions[i].type][j].ans[k]
                            });
                            //只要有一个答案不正确，整个题目就是错误的
                            if(isExpected != isSelected)
                                isWrong = true;
                        }
                        f[exam.questions[i].type][j].ans = answers;
                        f[exam.questions[i].type][j].isWrong = isWrong;

                        //是否已经答题的统计信息
                        if (isAnswered) num++;
                        f[exam.questions[i].type][j].hasAnswered = isAnswered;
                    }
                    //每种类型的总题量和已经答题的数量
                    vm.stat[exam.questions[i].type] = {num: num, total: exam.questions[i].questions.length};
                }
            }
            return f;
        };
    }]);
