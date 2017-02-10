angular.module('examconfigCtrl', ['baseService','pageService','contextService'])
    // 用户列表控制器，主要用于用户列表页面时使用
    .controller('examconfigController', ['$window', 'Paginator','BaseService','$http','$scope','$location','ContextService', function ($window, Paginator, BaseService,$http,$scope,$location,ContextService) {
        var vm = this;
        vm.tableName = 'examconfigs';
        vm.isGenerating = false;
        vm.paginator = Paginator;
        vm.paginator.reset();

        /** 用户定制的筛选函数 */
        vm.filterStat = function(record){
            if(vm.filteredStat.total)
                return true;
            if(vm.filteredStat.unsubmit && !record.isSubmit) return true;
            if(vm.filteredStat.submit && record.isSubmit && !record.isCorrected) return true;
            if(vm.filteredStat.correct && record.isCorrected) return true;
            return false;
        };

        vm.filteredStat = {
            unsubmit:false,submit:false,correct:false,total:true
        };
        /** 修改当前的筛选条件 */
        vm.setFilterStat = function(key){
            if(key){
                if(key=='unsubmit') vm.filteredStat.unsubmit = !vm.filteredStat.unsubmit;
                if(key=='submit') vm.filteredStat.submit = !vm.filteredStat.submit;
                if(key=='correct') vm.filteredStat.correct = !vm.filteredStat.correct;
                //任意一个选项选中，全选都不被选中
                if(vm.filteredStat.unsubmit || vm.filteredStat.submit || vm.filteredStat.correct) {
                    vm.filteredStat.total = false;
                    return;
                }
            }

            //三项都不选，显示全部
            vm.filteredStat = {
                unsubmit:false,submit:false,correct:false,total:true
            };
        };

        vm.filterIp = function(record){
            if(vm.filteredIp.total)
                return true;
            if(vm.filteredIp.normal){
                if(!record.isAbnormalRead && !record.isAbnormalSubmit) return true;
            }
            if(vm.filteredIp.abnormalRead){
                if(record.isAbnormalRead) return true;
            }
            if(vm.filteredIp.abnormalSubmit){
                if(record.isAbnormalSubmit) return true;
            }
            return false;
        };

        vm.filteredIp = {
            abnormalRead:false, abnormalSubmit:false,normal:false,total:true
        };
        /** 修改当前的筛选条件 */
        vm.setFilterIp = function(key){
            if(key){
                if(key=='abnormalRead') vm.filteredIp.abnormalRead = !vm.filteredIp.abnormalRead;
                if(key=='abnormalSubmit') vm.filteredIp.abnormalSubmit = !vm.filteredIp.abnormalSubmit;
                if(key=='normal') vm.filteredIp.normal = !vm.filteredIp.normal;
                //任意一个选项选中，全选都不被选中
                if(vm.filteredIp.abnormalSubmit || vm.filteredIp.abnormalRead || vm.filteredIp.normal) {
                    vm.filteredIp.total = false;
                    return;
                }
            }

            //三项都不选，显示全部
            vm.filteredIp = {
                abnormalRead:false,abnormalSubmit:false,normal:false,total:true
            };
        };

        //刷新数据，即获取考试的最新状态，以及相关所有试卷的信息
        vm.refreshStat = function() {
            vm.isSuccess = true;
            vm.processing = true;

            //分为三步，首先获取考试配置信息，然后获取试卷信息，最后完成统计
            Promise.resolve()
                .then(function(){
                    //首先获取考试配置信息
                    return $http.get('/api/examconfigs/' + vm.stat.configId);
                })
                .then(function(data){
                    if(data.data && data.data.success){
                        vm.stat.config = data.data.data;
                        return $http.get('/api/examconfigsop/' + vm.stat.configId);
                    }else return Promise.reject('检索考试配置信息失败：' + JSON.stringify(data.data));
                })
                .then(function(data){
                    if(data.data && data.data.success){
                        vm.stat.exam ={data: data.data.data};

                        //统计信息
                        vm.stat.exam.numTotal = 0;
                        vm.stat.exam.numUnsubmit = 0;
                        vm.stat.exam.numSubmit = 0;
                        vm.stat.exam.numCorrect = 0;
                        for(var i in vm.stat.exam.data){
                            vm.stat.exam.numTotal ++;
                            if(vm.stat.exam.data[i].isSubmit){
                                if(vm.stat.exam.data[i].isCorrected){
                                    vm.stat.exam.numCorrect ++;
                                }
                                else
                                    vm.stat.exam.numSubmit ++;
                            }else
                                vm.stat.exam.numUnsubmit ++;
                        }

                        //获取系统时间，更新考试配置的状态
                        return $http.get('/api/systemdate');
                    }else return Promise.reject('检索考试试卷信息失败：' + JSON.stringify(data.data));
                })
                .then(function(data){
                    if(data.data && data.data.success){
                        var now = new Date(data.data.date);
                        //考试的状态只有三种，未开始、考试中、已结束，分别根据当前时间是在开始时间和结束时间之前后来决定
                        if (new Date(vm.stat.config.dateEnd) < now)
                            vm.stat.config.status = '已结束';
                        else {//开始时间需要考虑提前分钟数
                            if (now < new Date(vm.stat.config.dateBeginAhead))
                                vm.stat.config.status = '未开始';
                            else
                                vm.stat.config.status = '考试中';
                        }

                        $scope.$digest();
                        return Promise.resolve();
                    }else return Promise.reject('检索服务器时间失败：' + JSON.stringify(data.data));
                })
                .catch(function(error){
                    alert(error);
                })
            ;
        };

        //刷新参考和交卷的IP地址信息
        vm.refreshIpInfo = function() {
            var pattern = vm.ipInfo.config.ipPatternB;
            if(!pattern) return;

            vm.isSuccess = true;
            vm.processing = true;

            //分为三步，首先获取考试配置信息，然后获取试卷信息，最后完成统计
            Promise.resolve()
                .then(function(){
                    return $http.patch('/api/examconfigsop/' + vm.ipInfo.config._id);
                })
                .then(function(data){
                    if(data.data && data.data.success){
                        vm.ipInfo.exam ={data: data.data.data};

                        //统计信息
                        vm.ipInfo.exam.numTotal = 0;
                        vm.ipInfo.exam.numAbnormalRead = 0;
                        vm.ipInfo.exam.numAbnormalSubmit = 0;
                        vm.ipInfo.exam.numNormal = 0;
                        var reg = new RegExp(pattern, 'g');
                        for(var i in vm.ipInfo.exam.data){
                            vm.ipInfo.exam.numTotal ++;
                            vm.ipInfo.exam.data[i].isAbnormalSubmit = false;
                            vm.ipInfo.exam.data[i].isAbnormalRead = false;
                            if(vm.ipInfo.exam.data[i].isSubmit &&
                                vm.ipInfo.exam.data[i].submitIP &&
                                !vm.ipInfo.exam.data[i].submitIP.match(reg)){
                                vm.ipInfo.exam.numAbnormalSubmit ++;
                                vm.ipInfo.exam.data[i].isAbnormalSubmit = true;
                            }else if(vm.ipInfo.exam.data[i].isRead &&
                                vm.ipInfo.exam.data[i].readIP &&
                                !vm.ipInfo.exam.data[i].readIP.match(reg)){
                                vm.ipInfo.exam.numAbnormalRead ++;
                                vm.ipInfo.exam.data[i].isAbnormalRead = true;
                            }else
                                vm.ipInfo.exam.numNormal ++;
                        }
                        return Promise.resolve();
                    }else return Promise.reject('检索考试试卷信息失败：' + JSON.stringify(data.data));
                })
                .catch(function(error){
                    alert(error);
                })
            ;
        };

        vm.viewType = 'list';
        //vm.viewType = 'table';

        vm.sortKey = 'tester.code';
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

        //查看对应的试卷情况，需要跳转到考试试卷页面，并执行筛选
        //页面间传递数据使用ContextService
        vm.showExams = function(configId, studentCode){
            ContextService.set('exams.config',configId);
            if(studentCode)
                ContextService.set('exams.student',studentCode);
            $('#modalStat').modal('hide');
            $location.path('/exams');
        };

        /** 查看考试的统计信息
         * 未开始和考试中可以实时统计交卷、未交卷、已判卷、分数等信息
         * 已经结束的考试可以查看各项统计信息，但不能刷新*/
        vm.showStat = function(configId){
            //统计信息都放在stat对象中
            vm.stat = {configId:configId};
            //刷新数据
            vm.refreshStat();
            $('#modalStat').modal();
        };

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //////生成试卷的过程开始/////
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        /** 执行生成试卷的过程
         * 1. 进度1：首先检查条件：
         *      试卷套数大于0，
         *      学生匹配人数要大于0，需要查询所有匹配学生的ID数组
         *      试卷已指定，且试卷题量大于0，需要查询指定的试卷的详细信息
         *      试卷组成要求的题量不大于试题库最大题量，需要查询匹配试卷要求的类属和类型的所有试题，然后执行手动统计
         *
         * 2. 进度1：准备试题数据结构，为了便于查找，将所有试题形成一个对象(结构：{category：[{type}]})
         * 3. 进度试卷套数：根据试卷的组成结构，生成指定套数的随机试题组，形成一个试卷模版(结构：[[question]])
         * 4. 进度学生人数：对每一个学生，先随机选择模版，再将对应的试题随机选择一个样式，并将答案随机排列，最后形成一条
         *      考试的记录保存到数据库。
         * */
        vm.insert = function(record){
            //为插班生生成试卷
            //先获取插班生的学号
            var studentCode = prompt("请输入插班生学号：");
            if (!studentCode) return;
            studentCode = studentCode.trim();
            if (studentCode.length < 1) return;

            Promise.resolve()
                .then(function(){
                    //确保不是已经生成了试卷的学生，原想是满足了匹配条件的就不能再生成
                    //但是存在可能，新增加的用户也满足匹配，现在需要插班，所以取消这一检查
                    //if(studentCode.match(new RegExp(record.pattern))){
                    //    return Promise.reject('该学生 [' + studentCode + '] 已经生成了试卷，不能再生成试卷。');
                    //}

                    //先确定学生身份
                    return $http.patch('/api/usersop',{code:studentCode, config:record._id});
                })
                .then(function(data){
                    if(data.data && data.data.success){
                        //调用试卷生成函数
                        vm.generate(record, false, data.data.data);
                        return Promise.resolve();
                    }
                    return Promise.reject(data.data);
                })
                .catch(function(error){
                    alert('生成插班考生试卷失败：' + error);
                })
            ;
        };

        vm.generate = function(record, isRegenerating, insertStudent){
            if (isRegenerating && !confirm('确定重新生成试卷吗？')) return;

            vm.isGenerating = true;

            //保存中间结果的数据结构
            vm.info = {};
            //每一步的任务名称
            vm.info.stepInfo  = '';
            //一共的步骤数量
            vm.info.stepTotal = 11;
            //有些步骤是比较耗时的操作，可以用明细信息来显示中间的进度
            vm.info.stepDetail = null;
            //最小需要的试卷模版，如果需要生成的试卷数量小于模版数，取小的数字
            vm.info.minTemplate;

            /** 这里用预言机制实现连串的动作，并统一捕捉错误
             * 由于最后一个生成学生试卷的步骤需要使用Promise.all方法，需要
             * 把两个Promise嵌套使用，这里用一个回调实现
             * */
            // 第一阶段，主要是检查检索数据，并生成试卷模版
            var firstPhase = function(callback1, callback2) {
                //由一个预言的满足(resolve())开始执行第一个连串动作
                Promise.resolve()
                    .then(function () {
                        //先查询是否有已经提交的试卷
                        if(isRegenerating) {
                            return $http.patch('/api/exams',{isRegenerating:true,criteria:{config:record._id,isSubmit:true}});
                        }
                        return Promise.resolve();
                    })
                    .then(function (data) {
                        //提醒，所有已经提交的试卷将会被删除！
                        if(isRegenerating) {
                            if(data && data.data && data.data.success) {
                                if(data.data.count>0 && !confirm('已经提交了 ' + data.data.count + ' 份试卷，重新生成试卷将删除这些提交的试卷，确定删除吗？'))
                                    return Promise.reject('已经取消了重新生成试卷。');
                            }else
                                return Promise.reject('检索已提交的试卷数量失败：' + JSON.stringify(data));
                        }
                        return Promise.resolve();
                    })
                    .then(function () {
                        //检查试卷套数
                        vm.info.stepInfo = '1.检查试卷套数';
                        if (!record.numTemplate || record.numTemplate < 1)
                        //驳回这个预言，交给统一的错误处理过程，并附上错误信息
                            return Promise.reject('试卷套数必须大于0');
                        //满足这个预言，没有给下一个步骤的数据
                        return Promise.resolve();
                    })
                    .then(function () {
                        //检查匹配学生的模式，并顺便查询所有学生的ID数组
                        vm.info.stepInfo = '2.检索匹配学生';
                        if(insertStudent)
                            return Promise.resolve();

                        if (!record.pattern)
                            return Promise.reject('没给定学生匹配模式');
                        //返回一个预言
                        return $http.post('/api/signgroups/pattern', {pattern: record.pattern});
                    })
                    .then(function (data) {
                        //data数据是上面预言返回的参数，这里是post请求
                        vm.info.stepInfo = '3.检查学生信息';

                        //插班生只有一个ID
                        if(insertStudent) {
                            vm.info.student = [insertStudent];
                            return Promise.resolve();
                        }

                        var st = data.data;
                        if (st && st.success) {
                            if (st.data.length < 1) {
                                return Promise.reject('没有检索到匹配学生[' + record.pattern + ']');
                            } else {
                                //保存学生ID数组到全局变量供后续动作使用
                                vm.info.student = st.data;
                                return Promise.resolve();
                            }
                        } else {
                            return Promise.reject('检索匹配学生失败[' + record.pattern + ']：' + JSON.stringify(st));
                        }
                    })
                    .then(function () {
                        vm.info.stepInfo = '4.检索试卷信息';

                        if (!record.sheet)
                            return Promise.reject('没有定义试卷');
                        //继续检索试卷对象，以期获得完整的试卷信息
                        return $http.get('/api/sheets/' + record.sheet._id);
                    })
                    .then(function (response) {
                        //上面预言返回的含详细信息的试卷对象
                        vm.info.stepInfo = '5.检索试题信息';
                        var sheet = response.data.data[0];

                        if (!sheet.num || sheet.num < 1 || !sheet.detail || sheet.detail.length < 1)
                            return Promise.reject('试卷没有指定试题组成');

                        vm.info.sheet = sheet;

                        /** 检索试题可以仅检索相关的试题，为了减少查询量，这里的检索分为两步：
                         * 1.    试题的类属信息必须先匹配在一个集合中，这里可以很大程度上减少查询数据量；
                         *      查询条件格式：category:{$in:[categoryIds]}
                         *
                         * 2.    将试卷组成的每一个类属和类型对形成一个查询子条件，取这些条件的逻辑或
                         *      查询条件格式：$or:[{category:categoryId,type:typeId}]
                         */
                        var categorys = [];
                        var or = [];
                        for (var i in sheet.detail) {
                            //第一个查询条件仅记录不同的类属id
                            if (categorys.indexOf(sheet.detail[i].category._id) < 0) {
                                categorys.push(sheet.detail[i].category._id);
                            }
                            //第二个查询条件则需要保存每一个类属类型对
                            or.push({category: sheet.detail[i].category._id, type: sheet.detail[i].type});
                        }
                        var filter = {category: {$in: categorys}, $or: or};

                        //先按类属排序，再按类型排序
                        var sort = {category: 1, type: 1};
                        return $http.put('/api/questions/', {criteriaFilter: filter, criteriaSort: sort});
                    })
                    .then(function (data) {
                        vm.info.stepInfo = '6.按类属和类型重新组织试题';
                        //上面预言返回的试题对象集合
                        var st = data.data;

                        var questions = {};
                        var oldCategory = null;
                        var oldType = null;
                        //遍历所有的试题，因其已经按类属和类型排序了，可以直接记录上次的类属和类型
                        for (var i in st) {
                            if (st[i].category == oldCategory) {
                                if (st[i].type == oldType) {
                                    //完全一样的类属和类型，保存到同一个节点下
                                    questions[st[i].category][st[i].type].push(st[i]);
                                } else {//同类属，不同类型，创建新属性数组
                                    oldType = st[i].type;
                                    questions[st[i].category][st[i].type] = [st[i]];
                                }
                            } else {
                                //新类属，必然是重新开始
                                oldCategory = st[i].category;
                                oldType = st[i].type;
                                questions[oldCategory] = {};
                                questions[oldCategory][st[i].type] = [st[i]];
                            }
                        }

                        vm.info.question = questions;
                        return Promise.resolve();
                    })
                    .then(function () {
                        vm.info.stepInfo = '7.检查试卷信息';

                        //试题要求的各类属和类型的题量不能大于现有试题的数量
                        var questions = null;
                        var sheet = vm.info.sheet;
                        try {
                            for (var i in sheet.detail) {
                                questions = vm.info.question[sheet.detail[i].category._id][sheet.detail[i].type];
                                if (questions.length < sheet.detail[i].num)
                                    return Promise.reject('试题要求题量大于现有最大题量：'
                                        + sheet.detail[i].category.name
                                        + ' ' + sheet.detail[i].type);
                            }
                        } catch (e) {
                            return Promise.reject('检测试题要求题量是否大于现有最大题量：' + e);
                        }
                        return Promise.resolve();
                    })
                    .then(function () {
                        //计算需要生成的试卷模版数量
                        if(vm.info.student.length<record.numTemplate)
                            vm.info.minTemplate = vm.info.student.length;
                        else
                            vm.info.minTemplate = record.numTemplate;

                        vm.info.stepInfo = '8.生成' + vm.info.minTemplate + '套试卷模版';

                        //生成各套试卷模版
                        vm.info.template = [];
                        var sheet = vm.info.sheet;
                        var questions;
                        var randomIndices;

                        //试卷模版是从试题库中按试卷组成取出试题ID的过程，最终的数据结构是[[questions]]
                        //即第一维是模版套数，第二维是试题ID
                        for (var num = 0; num < vm.info.minTemplate; num++) {
                            //对每一个试卷的组成
                            var template = [];
                            for (var i in sheet.detail) {
                                //取出相应的试题库
                                questions = vm.info.question[sheet.detail[i].category._id][sheet.detail[i].type];
                                //并随机产生指定数量的ID数组
                                //如果是全选，则不随机产生ID数组，直接用所有的ID，因为随机过程反正会在最后一步中实现
                                if(sheet.detail[i].num>=questions.length){
                                    randomIndices = [];
                                    for(var sq = 0; sq<questions.length; sq++)
                                        randomIndices.push(sq);
                                }else
                                    randomIndices = vm.getRandomIndex(questions.length, sheet.detail[i].num);
                                //从试题库中选择这些试题，保存到一个数组中
                                for (var j in randomIndices) {
                                    template.push(questions[randomIndices[j]]);
                                }
                            }

                            //保存一套试卷模版到临时变量中
                            vm.info.template.push(template);
                            //进度明细
                            vm.info.stepDetail = '已完成第 ' + (num+1) + ' / ' + vm.info.minTemplate + ' 套试卷模版';
                        }
                        ;
                        return Promise.resolve();
                    })
                    .then(function () {
                        vm.info.stepDetail = null;
                        vm.info.stepInfo = '9.删除原来已经生成的试卷';

                        if(insertStudent)
                            return Promise.resolve();
                        return $http.post('/api/examconfigs/' + record._id,{});
                    })
                    .then(function (data) {
                        if(insertStudent)
                            return Promise.resolve();
                        var st = data.data;
                        if (st && st.success) {
                            return Promise.resolve();
                        } else {
                            return Promise.reject('删除原来已经生成的试卷失败：' + JSON.stringify(st));
                        }
                    })
                    .then(function () {
                        //成功执行后，可以调用回调函数执行下一个动作了
                        callback1(null, callback2);
                    })
                    .catch( //统一错误处理
                        function (error) {
                            callback1(error, callback2);
                        }
                    );
            };

            // 第二阶段，主要是为每个学生生成一套试卷
            var secondPhase = function(error, callback){
                if(error)
                    callback(error);
                else {
                    vm.info.stepInfo = '10.为' + vm.info.student.length + '个学生随机选择试卷模版，生成随机试卷';

                    //为每一个学生生成试卷的过程
                    vm.info.detail = {count:0,total:vm.info.student.length};
                    var generate4student = vm.info.student.map(function(student){
                        /** 生成一个学生试卷的过程是这样的：
                         * 1.   随机选择试卷模版，取得模版已经存储的试题Id数组
                         * 2.   对每个选中的试题(qid)随机选取一个样式（目标desc,type,point），随机打乱答案的顺序（目标ans）
                         *      并记录参考正确答案的位置（目标参考答案数组的一个索引值）
                         * 3.   全部完成后，将参考答案数组、生成试题数组、学生ID、考试ID保存到数据库
                         */
                        //随机选择模版
                        var sheetIndex = vm.getRandomIndex(vm.info.template.length, 1)[0];

                        var questions = {};
                        var ansExpect = [];
                        //对一个模版的试题生成对应的试题
                        var question;
                        var form;
                        var ans;
                        var ansE;
                        var ansGenerated;
                        var images;
                        var pointTotal = 0;
                        var formIndex;
                        var qid;
                        var code;

                        //随机打乱试卷模板中试题的顺序
                        var qLength = vm.info.template[sheetIndex].length;
                        var qIndices = vm.getRandomIndex(qLength, qLength);

                        for(var i=0;i<qLength;i++){
                            question = vm.info.template[sheetIndex][qIndices[i]];
                            if(record.isFull) {//试卷检测模式，试题的每一个样式都会生成一个考题
                                for(formIndex = 0; formIndex<question.numForm; formIndex++) {
                                    qid  = question._id + '-' + formIndex;
                                    code = question.code + '-' + formIndex;
                                    form = question.form[formIndex];

                                    //打乱答案的排列顺序
                                    ans = vm.getRandomIndex(form.ans.length, form.ans.length);
                                    ansGenerated = [];
                                    ansE = [];
                                    for (var ansIndex = 0; ansIndex < ans.length; ansIndex++) {
                                        ansGenerated.push(form.ans[ans[ansIndex]].desc);
                                        if (form.ans[ans[ansIndex]].isValid) {
                                            ansE.push(ansIndex);
                                        }
                                    }

                                    //复制原题的图片
                                    images = null;
                                    if (form.images && form.images.length > 0) {
                                        images = [];
                                        for (var im in form.images)
                                            images.push(form.images[im]);
                                    }

                                    pointTotal += question.point;
                                    //按类型来分类存储
                                    if (!questions[question.type])
                                        questions[question.type] = [];
                                    //questionId不用原始的ID，而是后面加上"-<formIndex>"的后缀
                                    questions[question.type].push({
                                        qid: qid,
                                        code: code,
                                        type: question.type,
                                        point: question.point,
                                        desc: form.desc,
                                        images: images,
                                        ans: ansGenerated
                                    });
                                    //保存参考正确答案，记录的是参考正确答案的索引值，并且升序排列
                                    //questionId不用原始的ID，而是后面加上"-<formIndex>"的后缀
                                    ansExpect.push({qid: qid, ans: ansE.sort()});
                                }
                            }else{//正常考试生成试卷模式，一个试题随机选取一个式样
                                if(question.numForm>1) {
                                    //选随机样式
                                    formIndex = vm.getRandomIndex(question.numForm, 1)[0];
                                }else { //只有一个式样直接选定
                                    formIndex = 0;
                                }
                                form = question.form[formIndex];
                                qid = question._id + '-' + formIndex;
                                code = question.code + '-' + formIndex;

                                //打乱答案的排列顺序
                                ans = vm.getRandomIndex(form.ans.length, form.ans.length);
                                ansGenerated = [];
                                ansE = [];
                                for(var ansIndex = 0; ansIndex<ans.length; ansIndex ++){
                                    ansGenerated.push(form.ans[ans[ansIndex]].desc);
                                    if(form.ans[ans[ansIndex]].isValid){
                                        ansE.push(ansIndex);
                                    }
                                }

                                //复制原题的图片
                                images = null;
                                if(form.images && form.images.length>0){
                                    images = [];
                                    for(var im in form.images)
                                        images.push(form.images[im]);
                                }

                                pointTotal += question.point;
                                //按类型来分类存储
                                if(!questions[question.type])
                                    questions[question.type] = [];
                                questions[question.type].push({qid:qid, code:code, type:question.type, point:question.point
                                    ,desc:form.desc, images:images, ans: ansGenerated});
                                //保存参考正确答案，记录的是参考正确答案的索引值，并且升序排列
                                ansExpect.push({qid:qid, ans:ansE.sort()});
                            }
                        }

                        //重新组织试题，形成类型/试题数组的数组
                        var questionsFormatted = [];
                        for(var t in questions){
                            questionsFormatted.push({type: t, questions: questions[t]});
                        }

                        vm.info.detail.count ++;
                        //进度明细
                        vm.info.stepDetail = '已完成第 ' + vm.info.detail.count + ' / ' + vm.info.detail.total + ' 个学生的试卷生成';

                        //这个步骤的成功与否取决与请求的结果，直接返回$http的预言对象
                        return $http.post('/api/exams/',{
                            point: pointTotal, tester: student._id, config: record._id
                            , questions: questionsFormatted, ansExpect:ansExpect});
                    });
                    Promise.all(generate4student).then(function () {
                        //只有所有的步骤都成功了，才会执行下一个回调函数的内容。
                        callback(null);
                    }).catch(function (error) {
                        callback(error);
                    });
                }
            };

            // 第三阶段，主要是为更新视图
            var thirdPhase = function(error){
                vm.info.stepDetail = null;
                if(error) {
                    vm.isGenerating = false;
                    alert('错误：' + error + '\n错误位置：' + vm.info.stepTotal + '-' + vm.info.stepInfo);
                    $scope.$apply();
                }else {
                    //更新数据库的生成标记，再更新视图数据
                    if(insertStudent) {
                        vm.isGenerating = false;
                        alert('为 [' + insertStudent.code + ','+ insertStudent.name + '] 成功生成了1套试卷！');
                        $scope.$apply();
                    }else {
                        Promise.resolve()
                            .then(function () {
                                vm.info.stepInfo = '11. 更新考试设置生成试卷标志';
                                return $http.put('/api/examconfigsop/' + record._id, {isGenerated: true});
                            })
                            .then(function (data) {
                                vm.isGenerating = false;
                                alert('成功生成了' + vm.info.student.length + '套试卷！');
                                record.isGenerated = true;
                                record.dateGenerated = data.data.date;
                                //强制更新视图
                                $scope.$apply();
                                return Promise.resolve();
                            })
                            .catch(function (error) {
                                vm.isGenerating = false;
                                alert('错误：' + JSON.stringify(error) + '\n错误位置：' + vm.info.stepTotal + '-' + vm.info.stepInfo);
                                $scope.$apply();
                            })
                        ;
                    }
                }
            };

            //开始执行，参数是第二、三阶段的动作，只有第一阶段成功才会执行回调。
            firstPhase(secondPhase, thirdPhase);
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

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //////生成试卷的过程结束/////
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        /** 发布或取消发布试卷的动作 */
        vm.public = function(record, isPubliced){
            Promise.resolve()
                .then(function(){
                    if(isPubliced) {
                        if (confirm('确定发布考试[' + record.name + ']吗？'))
                            return $http.put('/api/examconfigsop/' + record._id, {isPublic: true});
                    }else{
                        if (confirm('确定取消发布考试[' + record.name + ']吗？'))
                            return $http.put('/api/examconfigsop/' + record._id, {isPublic: false});
                    }
                    return Promise.reject();
                })
                .then(function (data) {
                    if(data.data.success){
                        record.isPublic = isPubliced;
                        record.datePublic = data.data.date;
                        $scope.$apply();
                    }else{
                        if(isPubliced)
                            alert("发布试卷失败：" + JSON.stringify(data));
                        else
                            alert("取消发布试卷失败：" + JSON.stringify(data));
                    }
                    return Promise.resolve();
                })
            ;
        };

        //获取数据后的处理动作
        vm.paginator.format = function(data){
            for(var i in data){
                if(data[i].canReview) data[i].canReviewB = '';
                else data[i].canReviewB = '否';
                if(data[i].isFull) data[i].isFullB = '是';
                else data[i].isFullB = '';
                if(data[i].autoCorrect) data[i].autoCorrectB = '';
                else data[i].autoCorrectB = '手动';

                if(data[i].pattern && data[i].pattern.length>28) data[i].patternB = data[i].pattern.substr(0,28) + '...';
                else data[i].patternB = data[i].pattern;
            }
            return data;
        };

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

        //删除考试需要检查关联性，如果已经生成了试卷，则不能删除，否则试卷会不能正确查看
        vm.delete = function(record){
            Promise.resolve()
                .then(function () {
                    //检索与当前考试配置相关的试卷集合数量
                    //返回一个检索的预言
                    return $http.patch('/api/examconfigs/' + record._id, {});
                })
                .then(function (data) {
                    if(data.data && data.data.success){
                        if(data.data.count>0)
                            return Promise.reject("警告：已经生成了试卷，不能删除！");
                        return Promise.resolve();
                    }else
                        return Promise.reject('错误：' + BaseService.formatMessage(data));
                })
                .then(function () {
                    //没有关联，才显示删除确认框
                    vm.paginator.modalDelete(record);
                })
                .catch( //统一错误处理
                    function (error) {
                        alert(error);
                    }
                );

        };

        /** 检查参考和提交试卷的IP异常情形
         * 检查方法如下：
         * 1. 扫描对应的所有试卷的ipRead和ipSubmit，
         * 2. 对应设置中的ipPattern情况，如有不符合的，记录下来
         * */
        vm.showIP = function(examConfig){
            //统计信息都放在stat对象中
            vm.ipInfo = {config:examConfig};
            //刷新数据
            vm.refreshIpInfo();
            $('#modalIP').modal();
        };
    }])

    // 给修改用户页面提供的控制器
    .controller('examconfigEditController', ['$scope', '$routeParams', 'BaseService', '$http', '$location'
        , function ($scope, $routeParams, BaseService, $http, $location) {
        var vm       = this;
        vm.tableName = 'examconfigs';
        vm.isSuccess = true;
        vm.itemId = null;
        vm.type = 'edit';
        vm.processing = true;
        vm.data = {};

        /** 调整考试开始和结束的小时数 */
        vm.changeHour = function(isBegin){
            //调整小时从59到60，自动变为0
            //调整小时从0到-1，自动变为59
            if(isBegin) {
                if (vm.hourBegin > 23)
                    vm.hourBegin = 0;
                else if (vm.hourBegin < 0)
                    vm.hourBegin = 23;
                vm.adjustDate('begin');
            }else{
                if (vm.hourEnd > 23)
                    vm.hourEnd = 0;
                else if (vm.hourEnd < 0)
                    vm.hourEnd = 23;
                vm.adjustDate('end');
            }
        };
        vm.changeMinute = function(isBegin){
            //调整小时从59到60，自动变为0
            //调整小时从0到-1，自动变为59
            if(isBegin) {
                if (vm.minBegin > 59)
                    vm.minBegin = 0;
                else if (vm.minBegin < 0)
                    vm.minBegin = 59;
                vm.adjustDate('begin');
            }else{
                if (vm.minEnd > 59)
                    vm.minEnd = 0;
                else if (vm.minEnd < 0)
                    vm.minEnd = 59;
                vm.adjustDate('end');
            }
        };

        /** 调整开始结束时间以及时长会引起连锁反应 */
        vm.adjustDate = function(type){
            var min;
            if(type == 'begin' || type == 'duration'){
                //调整开始时间，如果设置了考试时长，则自动计算结束时间
                if(!isNaN(vm.hourBegin) && !isNaN(vm.minBegin) && !isNaN(vm.duration)){
                    min = vm.hourBegin * 60 + vm.minBegin + vm.duration;
                    vm.hourEnd = parseInt(min/60);
                    vm.minEnd = min%60;
                }
            }else if(type == 'end') {
                //调整开始时间，如果设置了考试时长，则自动计算结束时间
                if(!isNaN(vm.hourEnd) && !isNaN(vm.minEnd) && !isNaN(vm.duration)){
                    min = vm.hourEnd * 60 + vm.minEnd - vm.duration;
                    vm.hourBegin = parseInt(min/60);
                    vm.minBegin = min%60;
                }
            }
        };

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

        //试题类属
        BaseService.setEntity('sheets');
        BaseService.all().success(function (data) {
            vm.sheets = data;
            if(vm.type=='create' && !vm.data.sheet && vm.sheets.length>0)
                vm.data.sheet = vm.sheets[0]._id;
        });

        if($routeParams._id == 'create'){
            vm.type = 'create';
            vm.processing = false;
            var now = new Date();
            now.setSeconds(0);
            now.setMilliseconds(0);

            vm.data = {isFull:false, isPublic:false, isGenerated:false, numTemplate:10, minAhead:5, canReview:false, autoCorrect:true};

            //初始化时间
            vm.duration = 90;
            vm.date = now;
            vm.hourBegin = now.getHours();
            vm.minBegin = now.getMinutes();
            var min = vm.hourBegin * 60 + vm.minBegin + vm.duration;
            vm.hourEnd = parseInt(min/60);
            vm.minEnd = min%60;
        }else {
            vm.itemId = $routeParams._id;
            BaseService.setEntity(vm.tableName);
            BaseService.get(vm.itemId).success(function (data) {
                vm.processing = false;
                vm.isSuccess = false;
                if (data.success && data.data) {
                    vm.isSuccess = true;

                    vm.data = data.data;
                    //格式化开始和结束考试时间
                    vm.data.dateBegin = new Date(data.data.dateBegin);
                    vm.data.dateEnd = new Date(data.data.dateEnd);

                    vm.date = new Date(data.data.dateBegin);
                    vm.hourBegin = vm.data.dateBegin.getHours();
                    vm.minBegin = vm.data.dateBegin.getMinutes();
                    vm.hourEnd = vm.data.dateEnd.getHours();
                    vm.minEnd = vm.data.dateEnd.getMinutes();
                    vm.duration = (vm.hourEnd*60 + vm.minEnd) - (vm.hourBegin*60 + vm.minBegin);

                    //保存原始的试卷、试卷套数和学生匹配模式信息，供保存检测变动使用
                    vm.old = {
                        pattern: vm.data.pattern
                        ,sheet: vm.data.sheet
                        ,numTemplate: vm.data.numTemplate
                        ,isFull: vm.data.isFull
                    };
                } else {
                    vm.message = data;
                }
            });
        };

        /** 检测试卷、试卷套数和学生匹配模式信息是否变动了 */
        vm.isChanged = function () {
            if(vm.old.pattern != vm.data.pattern) return true;
            if(vm.old.sheet != vm.data.sheet) return true;
            if(vm.old.numTemplate != vm.data.numTemplate) return true;
            if(vm.old.isFull != vm.data.isFull) return true;
            return false;
        };

        /** 保存到数据库 */
        vm.save = function () {
            vm.processing    = true;
            vm.message       = '';

            //先要组合时间
            var ymd = vm.date.getFullYear() + '-' + (vm.date.getMonth()+1) + '-' + vm.date.getDate();
            vm.data.dateBegin = new Date(ymd + ' ' + vm.hourBegin + ':' + vm.minBegin);
            vm.data.dateEnd = new Date(ymd + ' ' + vm.hourEnd + ':' + vm.minEnd);

            BaseService.setEntity(vm.tableName);
            if(vm.type == 'create'){
                BaseService.create(vm.data)
                    .success(function (data) {
                        // 新增成功的后续动作，清空所有字段，并显示服务返回的信息
                        vm.processing = false;
                        vm.isSuccess = (data.success ? data.success : false);
                        if(vm.isSuccess){
                            alert('成功发布新考试');
                            //如果成功插入记录，跳转到修改考试配置页面
                            $location.path('/examconfigs/' + data._id);
                        }else
                            vm.message = BaseService.formatMessage(data);
                    });
            }else {
                //查看是否修改了试卷，试卷套数和学生匹配模式，如果修改了，则需要将生成状态修改为false
                Promise.resolve()
                    .then(function(){
                        return BaseService.update(vm.data);
                    })
                    .then(function (data) {
                        if(data.data.success){
                            vm.message = data.data.message;
                            return Promise.resolve();
                        }else
                            return Promise.reject('保存考试设置失败：' + JSON.stringify(data));
                    })
                    .then(function(){
                        if(vm.isChanged()){
                            return $http.put('/api/examconfigsop/' + vm.data._id, {isPublic: false, isGenerated: false});
                        }else
                            return Promise.resolve();
                    })
                    .then(function (data) {
                        vm.processing = false;
                        vm.isSuccess = true;
                        if(data){
                            if(!data.data.success){
                                vm.isSuccess = false;
                                return Promise.reject('修改考试配置状态失败：' + JSON.stringify(data));
                            }
                            vm.message = data.data.message;
                        }
                        $scope.$digest();
                        return Promise.resolve();
                    })
                    .catch(function(error){
                        vm.message = '错误：' + error;
                        $scope.$digest();
                    })
                    ;
            }
        };
    }]);
