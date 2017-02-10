angular.module('questionCtrl', ['eb.caret', 'treeControl','baseService','pageService','angular-meditor','angularFileUpload'])
    // 用户列表控制器，主要用于用户列表页面时使用
    .controller('questionController', ['$http','$window','Paginator','BaseService', function ($http, $window, Paginator, BaseService) {
        var vm = this;
        vm.tableName = 'questions';
        vm.paginator = Paginator;
        vm.paginator.reset();

        ////按试卷编号精确查找
        //vm.filterQuestionId = function(event){
        //    if(!event || event.charCode == 13) {
        //        if(vm.questionId){
        //            vm.paginator.templateFilter = {_id:vm.questionId};
        //            //关闭所有的定制筛选器
        //            for(var i in vm.paginator.customFilter){
        //                vm.paginator.customFilter[i].show = false;
        //            }
        //            vm.paginator.filter();
        //        }
        //    }
        //};
        //vm.questionId = null;

        /** 合并多个试题到一个试题，即收集所有选中的试题的样式到一个试题里面 */
        vm.merge = function(){
            if(vm.numSelected<2 || !confirm('确定合并' + vm.numSelected +
                    '个试题到一个试题吗？'))
                return;

            //准备请求数据，统计哪些试题涉及合并
            var idAll = [];
            for (var i= 0,len=vm.paginator.data.length; i<len; i++) {
                if(vm.paginator.data[i].selected) {
                    idAll.push(vm.paginator.data[i]._id);
                }
            }
            //默认第一个试题保留下来
            var idKeeped = idAll[0];

            Promise.resolve()
                .then(function(){
                    return $http.post('/api/questions/' + idKeeped,{_id:{$in:idAll}});
                })
                .then(function(data){
                    if(data.data && data.data.success){
                        vm.paginator.filter();
                        alert('成功！合并' + vm.numSelected + '道试题到[' + data.data.code + ']中，共' + data.data.numForm + '个样式');
                        return Promise.resolve();
                    }
                    return Promise.reject(data.data);
                })
                .catch(function(error){
                    alert('合并试题失败：' + JSON.stringify(error));
                })
            ;
        };

        /** 实时统计选中的个数 */
        vm.numSelected = 0;
        vm.selectBegin = 0;
        vm.setSelection = function(qid, event){
            if(!vm.paginator.data) return;

            //先定位发生选择事件的试题索引值
            var index = -1;
            for (var i= 0,len=vm.paginator.data.length; i<len; i++) {
                if(vm.paginator.data[i]._id == qid) {
                    index = i;
                    break;
                }
            }

            if(index<0) {
                return;
            }else if(event.shiftKey) {//Shift+Click, 连续选择
                //统计被选中的试题数量
                if(!vm.selectBegin) vm.selectBegin = 0;
                var selMin = vm.selectBegin;
                var selMax = index;
                if(selMin>selMax){
                    selMax = vm.selectBegin;
                    selMin = index;
                }
                vm.numSelected  = selMax-selMin+1;
                for (var i= 0,len=vm.paginator.data.length; i<len; i++) {
                    if(i<selMin)
                        vm.paginator.data[i].selected = false;
                    else if(i>selMax)
                        vm.paginator.data[i].selected = false;
                    else {
                        vm.paginator.data[i].selected = true;
                    }
                }
            }else{
                vm.selectBegin = index;
                if(event.ctrlKey){ //Ctrl+Click，不连续选择
                    //点击某一行，改变改行的被选中属性
                    if(vm.paginator.data[index].selected) {
                        vm.numSelected--;
                    }else{
                        vm.numSelected++;
                    }
                    vm.paginator.data[index].selected = !vm.paginator.data[index].selected;
                }else{//不带Shift，Ctrl的单击，仅仅选中当前条目，其他都不选
                    for (var i= 0,len=vm.paginator.data.length; i<len; i++) {
                        if(i==index) {
                            if(vm.paginator.data[i].selected){
                                vm.paginator.data[i].selected = false;
                                vm.numSelected = 0;
                            }else {
                                vm.paginator.data[i].selected = true;
                                vm.selectBegin = i;
                                vm.numSelected = 1;
                            }
                        }else
                            vm.paginator.data[i].selected = false;
                    }
                }
            }
        };

        //准备供筛选的类属和类型数据
        vm.typeFiltered = [];
        vm.categoryFiltered = [];
        vm.types = ['单选','多选','填空'];
        vm.categorys      = null;
        BaseService.setEntity('qcategorys');
        BaseService.all()
            .success(function (data) {
                vm.categorys = data;
                //填写一项为不设置，放在第一位
                vm.categorys.unshift({_id:0,name:'无'});
            });

        /** 执行筛选动作 */
        vm.filter = function(){
            if(vm.categoryFiltered.length == vm.categorys.length){
                //全选和全不选效果一样
                vm.categoryFiltered = [];
            }
            //保存到缓存中
            $window.localStorage.setItem(vm.tableName + '.all.category', vm.categoryFiltered);
            if(vm.typeFiltered.length == vm.types.length){
                //全选和全不选效果一样
                vm.typeFiltered = [];
            }
            //保存到缓存中
            $window.localStorage.setItem(vm.tableName + '.all.type', vm.typeFiltered);
            vm.paginator.extraFilter = vm.generateExtraFilter();
            vm.paginator.filter();
        };

        /**
         * 构造额外的筛选条件
         */
        vm.generateExtraFilter = function(){
            var criteria = null;

            var ids = [];
            var i;
            if(vm.categoryFiltered.length>0) {
                for (i in vm.categoryFiltered) {
                    if(vm.categoryFiltered[i]==0) {
                        ids.push(null);
                    }else{
                        ids.push(vm.categoryFiltered[i]);
                    }
                }

                var ic2 = {};
                ic2['$in'] = ids;
                if (!criteria) criteria = {};
                criteria['category'] = ic2;
            }

            if(vm.typeFiltered.length>0) {
                ids = [];
                for (i in vm.typeFiltered) {
                    ids.push(vm.typeFiltered[i]);
                }
                var ic = {};
                ic['$in'] = ids;
                if (!criteria) criteria = {};
                criteria['type'] = ic;
            }
            return criteria;
        };

        vm.paginator.entity.setEntity(vm.tableName);
        vm.paginator.customFilter = {
            desc:{
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

        //如果有缓存，则读取缓存保存的用户上次筛选条件
        var saved = $window.localStorage.getItem(vm.tableName + '.all.category');
        if(saved) vm.categoryFiltered = saved.split(',');
        saved = $window.localStorage.getItem(vm.tableName + '.all.type');
        if(saved) vm.typeFiltered = saved.split(',');

        //记录排序的字段名称和方向
        vm.paginator.sortColumn = 'code';
        vm.paginator.sortDir = 1;
        saved = $window.localStorage.getItem(vm.tableName + '.all.sortColumn');
        if(saved) vm.paginator.sortColumn = saved;
        saved = $window.localStorage.getItem(vm.tableName + '.all.sortDir');
        if(saved) vm.paginator.sortDir = saved;

        ////读取缓存中的页码配置信息
        //var hasPageInfo = false;
        //saved = $window.localStorage.getItem(vm.tableName + '.all.pageSize');
        //if(saved){
        //    vm.paginator.pageSize = parseInt(saved);
        //    hasPageInfo = true;
        //}
        //saved = $window.localStorage.getItem(vm.tableName + '.all.page');
        //if(saved){
        //    vm.paginator.current = parseInt(saved);
        //    hasPageInfo = true;
        //}
        //
        ////读取缓存中的筛选信息
        //saved = $window.localStorage.getItem(vm.tableName + '.all.showFilter');
        //if(saved) vm.paginator.showFilter = (saved=='true');
        //saved = $window.localStorage.getItem(vm.tableName + '.all.customFilter');
        //if(saved) vm.paginator.customFilter = JSON.parse(saved);
        //
        ///** 筛选保存到缓存中 */
        //vm.filter = function(event){
        //    if(!event || event.charCode == 13) {
        //        vm.paginator.filter(event);
        //        $window.localStorage.setItem(vm.tableName + '.all.showFilter', vm.paginator.showFilter);
        //        $window.localStorage.setItem(vm.tableName + '.all.customFilter', JSON.stringify(vm.paginator.customFilter));
        //    }
        //};
        ///** 直接指定页码保存到缓存中 */
        //vm.goto = function(event){
        //    if(event.charCode == 13) {
        //        vm.paginator.goto(event);
        //        $window.localStorage.setItem(vm.tableName + '.all.page', vm.paginator.current);
        //    }
        //};
        ///** 直接指定页码保存到缓存中 */
        //vm.page = function(pageIndex){
        //    vm.paginator.page(pageIndex);
        //    $window.localStorage.setItem(vm.tableName + '.all.page', vm.paginator.current);
        //};
        ///** 设置每页行数保存到缓存中 */
        //vm.setPageSize = function(event){
        //    if(event.charCode == 13) {
        //        vm.paginator.setPageSize(event);
        //        $window.localStorage.setItem(vm.tableName + '.all.pageSize', vm.paginator.pageSize);
        //    }
        //};

        /** 排序 */
        vm.setSort = function(name){
            vm.paginator.sort(name);
            //保存用户最后的排序条件和方向
            $window.localStorage.setItem(vm.tableName + '.all.sortDir', vm.paginator.sortDir);
            $window.localStorage.setItem(vm.tableName + '.all.sortColumn', vm.paginator.sortColumn);
        };

        vm.paginator.extraFilter = vm.generateExtraFilter();
        //if(hasPageInfo)
        //    vm.paginator.page(vm.paginator.current);
        //else
        vm.paginator.refreshFilter();
    }])

    // 批量导入试题
    .controller('questionImportController',['FileUploader', 'BaseService'
        , function(FileUploader, BaseService){
        var vm       = this;
        vm.tableName = 'questions';
        var uploader = vm.uploader = new FileUploader();
        vm.questions     = null;
        vm.category      = null;

        BaseService.setEntity('qcategorys');
        BaseService.all()
            .success(function (data) {
                vm.categorys = data;
                //填写一项为不设置，放在第一位
                vm.categorys.unshift({_id:0,name:'不设置'});
                //为默认动作
                vm.category = 0;
            });

        //导入数据到数据库
        vm.import = function () {
            vm.progressTitle      = '导入试题到数据库';
            vm.isProcessing       = true;
            vm.progress           = 0;
            vm.progressTotal      = vm.questions.length;
            vm.progressValue      = 0;
            vm.message            = null;
            vm.isSuccess          = true;

            BaseService.setEntity(vm.tableName);
            async.whilst(
                function () {
                    var len = vm.questions.length;
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
                    var uData      = vm.questions[0];
                    //看看是否需要批量设定类属
                    if(vm.category!=0){
                        uData.category = vm.category;
                    }

                    BaseService.create(uData).success(function (data) {
                        // 新增成功的后续动作，清空所有字段，并显示服务返回的信息
                        if(data.success) {
                            vm.questions.splice(0,1);
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
                        vm.message   = '批量导入试题失败：' + err;
                    }else{
                        vm.message   = '批量导入试题成功。';
                        vm.isSuccess = true;
                    }
                }
            );
        };

        //删除
        vm.delete = function(index){
            vm.message = null;
            vm.questions.splice(index,1);
        };
        vm.deleteAll = function(){
            vm.message = null;
            vm.questions = null;
        };

        // FILTERS 文件类型筛选，目前仅支持JSON格式的输入
        uploader.filters.push({
            name: 'jsFilter',
            fn: function(item) {
                var pos = item.name.lastIndexOf('.');
                var extension = item.name.substr(pos+1);
                return '|json|'.indexOf(extension) !== -1;
            }
        });

        vm.message       = null;
        vm.isSuccess     = true;
        vm.isProgressing = false;
        vm.fileSize      = 0;
        vm.fileReaded    = 0;
        vm.progress      = 0;

        /** 解析从文件中读取的JS字符串到JSON数组 */
        vm.parse = function(string){
            var array = JSON.parse(string);

            if(array && array.length>0){
                var matched = false;
                for(var i in array){
                    //如果读取成功，可能还需要定位类属，如果类属的名字与已有的类属表中的一致，就自动匹配
                    //否则设置为空
                    if(array[i].category){
                        matched = false;
                        for(var j in vm.categorys){
                            if(array[i].category == vm.categorys[j].name){
                                array[i].categoryB = vm.categorys[j];
                                array[i].category = vm.categorys[j]._id;
                                matched = true;
                                break;
                            }
                        }

                        if(!matched){
                            array[i].category = null;
                            array[i].categoryB = null;
                        }
                    }

                    //设置主文档的题干和样式数量，主要是为了显示使用，真正使用的是子文档的题干
                    if(array[i].form && array[i].form.length>0) {
                        array[i].desc = array[i].form[0].desc;
                        array[i].numForm = array[i].form.length;
                        //准备样式的字符串供提示使用
                        array[i].formString = JSON.stringify(array[i].form);
                    }

                    //默认分值为1
                    if(!array[i].point)
                        array[i].point = 1;

                }
                return array;
            }

            return null;
        };

        //新选择文件后进行解析工作
        uploader.onAfterAddingFile = function(fileItem) {
            var reader  = new FileReader();
            vm.fileSize = fileItem._file.size;
            if(vm.fileSize<=0) return;

            vm.progressTitle = '解析文件';
            vm.isProgressing = true;
            vm.progress      = 0;
            vm.fileReaded    = 0;
            vm.readed     = [];
            reader.readAsText(fileItem._file, 'UTF8');

            //加载过程中显示加载进度
            reader.onprogress = function(step){
                vm.readed.push(step.target.result);

                //计算当前进度
                vm.fileReaded += step.loaded;
                vm.progress = (vm.fileReaded / vm.fileSize) * 100;
            };

            //全部读取完毕
            reader.onload = function(){
                //拼接所有读入的字符串，用JSON来解析成数组
                var readedQuestions = null;
                try{
                    readedQuestions = vm.parse(vm.readed.join(''));
                }catch(e){
                    vm.isProgressing = false;
                    vm.isSuccess     = false;
                    vm.message       = '解析文件 ' + fileItem._file.name + ' 失败：' + e
                        + '\n' + vm.readed.join('');
                    return;
                }

                vm.isProgressing = false;
                if(readedQuestions && readedQuestions.length>0) {
                    if (!vm.questions) vm.questions = [];
                    vm.questions = vm.questions.concat(readedQuestions);
                    vm.isSuccess     = true;
                    vm.message       = '成功解析文件：' + fileItem._file.name + '，导入 ' +  readedQuestions.length + ' 条记录！';
                }else{
                    vm.isSuccess     = false;
                    vm.message       = '解析文件文件失败：' + fileItem._file.name + '，没有导入试题！';
                }
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

    // 给修改用户页面提供的控制器
    .controller('questionEditController', ['$window', 'UtilsService', '$scope','$http','Auth','AuthToken','$routeParams', 'BaseService', 'FileUploader'
        , function ($window, UtilsService, $scope, $http, Auth, AuthToken, $routeParams, BaseService, FileUploader) {
        var vm = this;
        vm.tableName = 'questions';

        /** 打开插入源代码对话框 */
        vm.showCode = function(record){
            vm.codeEntity = record;
            vm.givenCode = '';
            $('#modalCode').modal();
        };
        /** 插入源代码到试题提干中 */
        vm.insertCode = function(){
            if(vm.givenCode && vm.givenCode.length>0) {
                //默认插入在最后
                if(!vm.caret.get)
                    vm.caret.get = vm.codeEntity.desc.length;
                //从caret变量中获取插入的位置
                var prefix = vm.codeEntity.desc.substr(0, vm.caret.get);
                var suffix = vm.codeEntity.desc.substr(vm.caret.get);
                vm.codeEntity.desc = prefix + '\n<pre>\n' + UtilsService.html_encode(vm.givenCode) + '\n</pre>\n';
                //设置光标在插入的代码之后
                vm.caret.set = vm.codeEntity.desc.length;
                vm.codeEntity.desc += suffix;
            }
            $('#modalCode').modal('hide');
        };

        vm.tree = {};

        //默认的图片选择模式，单选single，多选multi
        vm.imageSelectMode='single';

        vm.tree.options = {
            nodeChildren: "children",
            dirSelectable: true
        };

        /** 树形结构的数据结构，含
         * name     节点对应的目录完整路径名称，确保不重复，可作为节点标识符
         * label    节点对应的目录名称，显示时使用
         * isLoaded 是否已经加载，即是否完成数据查询，加载了其子目录信息
         * children 是子节点的数组，如果没有子节点，可定义为{}，确保仍旧显示为目录的图标
         * */
        vm.tree.data = [];

        //树形结构上的展开事件，仅仅关注是否加载子节点数组
        vm.treeToggle = function(node, expanded){
            //获取该节点在当前树形结构上的所有路径节点
            var treePaths = vm.getPath(node.name);
            if(!treePaths){
                alert('定位节点路径失败：' + JSON.stringify(node));
                return;
            }
            var nodePos = treePaths.length-1;

            Promise.resolve()
                .then(function(){
                    //是否需要加载这个节点
                    if(!node.isLoaded){
                        return $http.put('/api/questionimages',{dir:node.name});
                    }
                    return Promise.resolve();
                })
                .then(function(data){
                    if(data && data.data.success){
                        //加载数据到树形结构上
                        vm.loadTreeData(treePaths[nodePos], node.name, data.data.data, false);

                        treePaths[nodePos].isLoaded = true;
                    }
                    return Promise.resolve();
                })
                .catch(function(error){
                    alert(error);
                })
            ;
        };

        /** 树形结构上的选中事件
         * 一旦选中一个节点，如果该节点上次没有被选中，则选中此节点，
         * 如果此节点没有加载下一级节点，则加载数据，最后展开它。
         * 如果该节点本来就被选中了，则还是选中此节点，但是收拢此节点。
         * 是否被选中了，需要比较当前选中节点的变量的标识符
         * @param node
         * @param selected
         */
        vm.treeSelected = function(node){
            //设置当前目录位置
            vm.tree.currentPath = node.name;
            //获取该节点在当前树形结构上的所有路径节点
            var treePaths = vm.getPath(node.name);
            if(!treePaths){
                alert('定位节点路径失败：' + JSON.stringify(node));
                return;
            }
            var nodePos = treePaths.length-1;
            //选中自身节点
            var selectedNode = treePaths[nodePos];

            Promise.resolve()
                .then(function(){
                    //是否需要加载这个节点
                    if(!selectedNode.isLoaded){
                        return $http.put('/api/questionimages',{dir:vm.tree.currentPath});
                    }
                    return Promise.resolve();
                })
                .then(function(data){
                    if(data && data.data.success){
                        //加载数据到树形结构上
                        vm.loadTreeData(selectedNode, vm.tree.currentPath, data.data.data, true);

                        selectedNode.isLoaded = true;
                    }
                    return Promise.resolve();
                })
                .then(function(){
                    //通过查看最后一个展开的节点是否等于当前结点来判断当前结点是否已经展开
                    var last = vm.tree.expanded.length-1;
                    if(last>-1 && selectedNode.name == vm.tree.expanded[last].name){
                        //展开除了自身节点以外的所有的路径节点
                        treePaths.splice(nodePos,1);
                    }

                    //是否需要更新图片数组
                    if(vm.tree.lastSelected.name != selectedNode.name){
                        vm.images = selectedNode.images;
                    }

                    //展开所有的路径节点
                    vm.tree.expanded = treePaths;
                    vm.tree.selected = selectedNode;
                    vm.tree.lastSelected = selectedNode;
                    $scope.$digest();
                    return Promise.resolve();
                })
                .catch(function(error){
                    alert(error);
                })
            ;
        };

        /** 获取该节点在当前树形结构上的所有路径节点
         *  返回一个路径节点的数组
         *  获取的方法是，从根节点开始，匹配开始的名称属性，发现匹配则表示发现一个祖先节点，
         *  则将它加入节点数组，并选择它作为下一次搜索的节点，以此类推，直到找到自身节点为止
         */
        vm.getPath = function(nodeName){
            var current = vm.tree.data;
            var paths = [];
            var node;

            //在当前数组中匹配开始的名称属性
            do{
                node = null;
                for(var i in current){
                    if(nodeName.indexOf(current[i].name)==0){
                        //找到匹配，记录当前结点
                        node = current[i];
                        //将发现的当前结点存入路径数组中
                        paths.push(node);
                        //设置下一个当前数组
                        current = current[i].children;
                        break;
                    }
                }
                //只要没有找到完全匹配的节点，继续
            }while(node && node.name != nodeName);

            if(node)
                return paths;
            return null;
        };

        /** 初始化树形结构
         * 第一次加载用户的工作目录信息，步骤为：
         * 1.   检查工作目录存在情况，如果无，则立即创建；
         * 2.   查询工作目录下所有的子目录和图片文件信息；
         * 3.   对查询所得的数据进行筛选：
         *          如果是子目录，添加到树形结构的节点中，标记其isLoaded属性为false
         *          如果是图片，添加到图片列表中
         * 4.   标志当前节点的isLoaded属性为true.
         */
        vm.treeInit = function(){
            //设置当前的工作目录位置，即 ./<用户代码>
            vm.tree.currentPath = './' + Auth.user.code;
            vm.images = [];
            Promise.resolve()
                .then(function(){
                    //检查工作目录情况
                    return $http.patch('/api/questionimages',{code:Auth.user.code});
                })
                .then(function(data){
                    if(data.data && data.data.success){
                        //查询工作目录下所有的子目录和图片文件信息；
                        return $http.put('/api/questionimages',{dir:vm.tree.currentPath});
                    }
                    return Promise.reject('创建/检索工作目录[./' + Auth.user.code + ']失败');
                })
                .then(function(data){
                    if(data.data && data.data.success){
                        //对查询到的子目录和图片文件信息进行筛选
                        var root = {name:vm.tree.currentPath, label:Auth.user.code, isLoaded:true};

                        vm.loadTreeData(root, vm.tree.currentPath, data.data.data, true);

                        //将根节点插入到树形结构中
                        vm.tree.data.push(root);

                        //自动选中并展开根节点
                        vm.tree.lastSelected = root;
                        vm.tree.selected = vm.tree.data[0];
                        vm.tree.expanded = [vm.tree.data[0]];
                        $scope.$digest();
                        return Promise.resolve();
                    }
                    return Promise.reject('检索工作目录[./' + Auth.user.code + ']的图片和子目录信息失败');
                })
                .catch(function(error){
                    vm.message = error;
                })
            ;

        };

        /**
         * 加载指定节点的子目录和图片的过程，返回children数组
         * @param node
         */
        vm.loadTreeData = function(selectedNode, path, files, loadImages){
            //对查询到的子目录和图片文件信息进行筛选
            var children = [];
            var images = [];
            for(var i in files){
                if(files[i].isFile){
                    //一个文件则添加到图片数组中
                    images.push({isSelected:false,_id:files[i]._id,name:files[i].name,extension:files[i].extension,fname:files[i].fname});
                }else{
                    //一个子目录 等于一个树形结构上的节点
                    children.push({
                        name:path + '/' + files[i].name
                        ,label:files[i].name
                        ,isLoaded:false
                        ,children:{}
                    });
                }
            }

            //为了确保显示成目录的图标，如果没有子节点，则设置children属性为对象
            if(children.length<1)
                children = {};

            //替换当前结点的孩子属性
            selectedNode.children = children;
            selectedNode.images = images;

            if(loadImages)
                vm.images = selectedNode.images;
        };

        //给当前样式添加图片，弹出图片选择对话框
        vm.showImageDialog = function(form){
            vm.currentForm = form;
            vm.message = null;
            if(vm.tree.data.length<1)
                vm.treeInit();
            $('#modalImage').modal();
        };

        /**
         * 转换图片显示模式
         * @param mode
         */
        vm.setImageSelectMode = function(mode){
            vm.imageSelectMode = mode;
            $scope.$digest();
        };

        /** 选定一个图片 */
        vm.selectImage = function(fname){
            if(!vm.currentForm.images)
                vm.currentForm.images = [];
            if(fname) //单选
                vm.currentForm.images.push(fname);
            else{//多选
                for(var i in vm.images){
                    if(vm.images[i].isSelected) {
                        vm.currentForm.images.push(vm.images[i].fname);
                        vm.images[i].isSelected = false;
                    }
                }
            }
            $('#modalImage').modal('hide');
        };

        /** 删除一个图片 */
        vm.removeImage = function(form, index){
            form.images.splice(index,1);
        };

        /** 单击图片放大显示 */
        vm.showImage = function(item){
            //两种情形下会显示图片放大窗口，添加图片和题干预览
            //其中添加图片时图片的信息很多，是一个对象，而题干预览则只有一个地址信息
            var image = new Image();
            if(item.name) {
                vm.image = item;
                image.src = 'public/uploads/' + vm.image.fname;
            }else{
                vm.image = null;
                image.src = 'public/uploads/' + item;
            }

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

        //修正FileUploader中删除文件后不能重新选择的问题，这里要注意：
        // isEmptyAfterSelection 的重载和input元素定义时的参数：multiple
        FileUploader.FileSelect.prototype.isEmptyAfterSelection = function() {
            return false;
        };
        var uploader = vm.uploader = new FileUploader({
                url: '/api/imageUploader'
                ,headers:{'x-access-token':AuthToken.getToken()}
            });
        //选择文件后立即上传，并从队列中删除
        uploader.removeAfterUpload = true;
        uploader.autoUpload = true;
        /** 文件类型选择，注意这里的设置并不会影响文件选择框，而是在用户选择文件后
         * 在进行筛选，它决定了哪些用户选择的文件可以进入上传队列 */
        uploader.filters.push({
            name: 'imageFilter',
            fn: function(item /*{File|FileLikeObject}*/, options) {
                var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                return '|jpg|png|jpeg|bmp|gif|tiff|'.indexOf(type) !== -1;
            }
        });
        /** 全部上传结束 */
        uploader.onCompleteAll = function(){
            vm.imageUploading = false;
            //如果是单选，且选中了至少一幅图片，自动添加
            if(vm.imageSelectMode == 'single' && vm.images.length>0){
                vm.selectImage();
            }
        };

        /** 上传过程中 */
        uploader.onProgressItem = function(item, progress){
            vm.imageUploading = true;
        };

        /**
         * 每个上传的文件增加一些参数，便于在服务器端保存到数据库中
         * @param fileItem
         */
        uploader.onAfterAddingFile = function(fileItem) {
            //取得文件的全名，不含扩展名
            var name = fileItem.file.name;

            var pos = name.lastIndexOf('.');
            var extension = null;
            if(pos>0) {
                //确保扩展名小写
                extension = name.substring(pos+1);
                name      = name.substring(0, pos);
            }else
                name = '';
            if(extension){
                extension               = extension.toLowerCase();
                fileItem.file.extension = extension;
                fileItem.file.name      = name + '.' + extension;
            }

            //传入额外的参数供保存到数据库时使用size，name，path，user
            fileItem.formData.push(
                {
                    path: vm.tree.currentPath
                    ,size: fileItem.file.size
                    ,name: name
                    ,user: Auth.user._id
                });
        }

        /** 上传成功后的处理函数 */
        uploader.onCompleteItem = function(fileItem, response) {
            vm.imageMessage = null;
            if(response.isSuccess){
                //新增的图片自动选中
                vm.images.push({isSelected:true,_id:response.data._id,name:response.data.name,extension:response.data.extension,fname:response.data.fname});
            }else{
                vm.imageMessage = BaseService.formatMessage(response);
            }
        };

        /** 上传出错事件 */
        uploader.onErrorItem = function(item, response, status, headers){
            vm.imageMessage = '上传文件出错：' + item + '。 ' + BaseService.formatMessage(response);
        };
        vm.uploader = uploader;
        vm.imageUploading = false;
        vm.isSuccess = true;
        vm.itemId = null;
        vm.type = 'edit';
        vm.processing = true;

        //试题类型
        vm.types = ['单选','多选','填空'];

        /** 初始化试题, 有两种方式，1种是全新初始化，另一种是需要根据上下文来初始化的，
         * 例如：用户在筛选试题后新建试题的，筛选的条件将作为初始值；若新建试题后连续新增，则基本保留上一道题的
         * 值，仅仅清空题干和样式
         * @param isNew 是否是全新初始化
         */
        vm.init = function(isNew){
            if(isNew) {
                vm.data = {point: 1};
                var saved = $window.localStorage.getItem(vm.tableName + '.all.type');
                if(saved){
                    vm.data.type = saved.split(',')[0];
                }else
                    vm.data.type = vm.types[0];
                if (vm.categorys && vm.categorys.length > 0)
                    vm.data.category = vm.categorys[0]._id;
                vm.data.form = [{desc: '', ans: [{isValid: true}, {}, {}, {}]}];
            }else{
                //如果类型和类属没有设定，则用默认值来初始化
                if(!vm.data.type) {
                    var saved = $window.localStorage.getItem(vm.tableName + '.all.type');
                    if(saved){
                        vm.data.type = saved;
                    }else
                        vm.data.type = vm.types[0];
                }
                if (!vm.data.category && vm.categorys && vm.categorys.length > 0)
                    vm.data.category = vm.categorys[0]._id;
                vm.data.form = [{desc: '', ans: [{isValid: true}, {}, {}, {}]}];
            }
        };
        vm.data ={point:1};

        //删除一个样式
        vm.delete = function(index){
            //必须保留至少一个样式
            if(vm.data.form.length<2) return;

            if(confirm('确定删除这个样式吗？'))
                vm.data.form.splice(index,1);
        };

        //增加一个样式
        vm.addForm = function(record, index){
            if(record){
                var copied = {desc:record.desc};
                copied.ans = [];
                for(var i in record.ans){
                    copied.ans.push({desc:record.ans[i].desc,isValid:record.ans[i].isValid});
                }
                copied.images = [];
                for(var i in record.images){
                    copied.images.push(record.images[i]);
                }
                vm.data.form.splice(index, 0, copied);
            }else{
                vm.data.form.unshift({desc:'',ans:[{isValid:true},{},{},{}]});
            }
        };

        if($routeParams._id == 'create'){
            vm.type = 'create';
            vm.processing = false;
            vm.init(true);
        }else {
            vm.itemId = $routeParams._id;
            BaseService.setEntity(vm.tableName);
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
        };

        //试题类属
        BaseService.setEntity('qcategorys');
        BaseService.all().success(function (data) {
            vm.categorys = data;
            if(vm.type=='create' && !vm.data.category) {
                //为新增试题选择默认的类属
                //如果试题列表中有筛选条件，则选取筛选条件中的第一项
                var saved = $window.localStorage.getItem(vm.tableName + '.all.category');
                if(saved){
                    var filteredIds = saved.split(',');
                    if(filteredIds.length>0) {
                        vm.data.category = filteredIds[0];
                        return;
                    }
                }
                //否则，类属查询结果的第一项
                vm.data.category = vm.categorys[0]._id;
            }
        });

        /** 检查输入项是否合法,
         * 这里主要检查样式中题干不能为空，候选答案不能为空
          */
        vm.check = function(){
            for(var i in vm.data.form){
                if(!vm.data.form[i].desc){
                    return '题干不能为空！';
                }
                //答案的描述都不能为空，且不能重复
                var desc = [];
                var numValid = 0;
                for(var j in vm.data.form[i].ans){
                    if(!vm.data.form[i].ans[j].desc)
                        return '候选答案的描述不能为空';
                    if(desc.indexOf(vm.data.form[i].ans[j].desc)>-1)
                        return '候选答案有重复项：' + vm.data.form[i].ans[j].desc;
                    else {
                        if(vm.data.form[i].ans[j].isValid)
                            numValid ++;
                        desc.push(vm.data.form[i].ans[j].desc);
                    }
                }

                //单选题只能有一个答案
                if(vm.data.type == '单选' && numValid!=1)
                    return '单选题必须且只能有一个答案';

                //多选题至少一个答案
                if(vm.data.type == '多选' && numValid<1)
                    return '多选题至少有一个答案';
            }
            return null;
        };

        /** 在单选题中，确保只有一个正确答案 */
        vm.checkValid = function(record, answer){
            if(vm.data.type && vm.data.type == '单选'){
                if(answer.isValid){//增加一个正确答案，要取消其他的正确答案
                    for(var i in record.ans){
                        if(record.ans[i].isValid) record.ans[i].isValid = false;
                    }
                    answer.isValid = true;
                }else{//取消一个正确答案，要看是不是这是唯一的答案，如果是则不允许取消
                    var num = 0;
                    for(var i in record.ans){
                        if(record.ans[i].isValid) num++;
                    }
                    if(num<1)
                        answer.isValid = true;
                }
            }
        };

        /** 保存到数据库 */
        vm.save = function (editForm) {
            var checkResult = vm.check();
            if(checkResult){
                alert('输入不完整：' + checkResult);
                return;
            }

            vm.processing    = true;
            vm.message       = '';

            BaseService.setEntity(vm.tableName);
            if(vm.type == 'create'){
                BaseService.create(vm.data)
                    .success(function (data) {
                        // 新增成功的后续动作，清空所有字段，并显示服务返回的信息
                        vm.processing = false;
                        vm.isSuccess = (data.success ? data.success : false);
                        if(vm.isSuccess){
                            //如果成功插入记录，清空数据，并设置初始状态
                            vm.init();
                            editForm.$setPristine();
                        }else
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
