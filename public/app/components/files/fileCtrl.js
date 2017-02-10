/**
 * Created by Administrator on 2015/7/8.
 */
'use strict';

angular.module('fileCtrl', ['angularFileUpload', 'utilsService','arrayService', 'contextService', 'baseService','ngSanitize',
    'com.2fdevs.videogular',
    'com.2fdevs.videogular.plugins.controls',
    'com.2fdevs.videogular.plugins.overlayplay',
    'com.2fdevs.videogular.plugins.poster'])

    //文件统计控制器
    .controller('fileStatController', ['$http', 'BaseService', function($http, BaseService) {
        var vm        = this;
        var dateCreate = new Date();
        var today = dateCreate.getFullYear() + '-'
            + (dateCreate.getMonth()+1) + '-'
            + dateCreate.getDate();
        vm.beginDate = new Date(today + ' 00:00');
        vm.endDate = new Date(today + ' 23:59');
        vm.data = null;
        vm.showDetailName = false;

        //显示某个学生上交作业的明细
        vm.showFiles = function(record){
            vm.current = record;
            $("#modalDetail").modal();
        };
        //从表格视图显示某个学生上交作业的明细
        vm.showDetails = function(_id){
            var record;
            for(var i=0; i<vm.data.detail.length; i++) {
                record = vm.data.detail[i];
                if(record.info._id == _id) {
                    vm.current = record;
                    $("#modalDetail").modal();
                    break;
                }
            }
        };

        /** 检查同一IP重复签到的情形
         * 检查方法如下：
         * 1. 扫描所有的上传文件明细，对IP不为空的记录下来，并记录IP出现的次数。
         * 2. 对IP出现次数大于1的记录，收集其学号姓名ID等信息
         * */
        vm.checkIP = function(){
            var ips = {};
            var ip;

            //扫描所有明细，记录IP出现的次数
            for(var i in vm.dataGrid){
                ip = vm.dataGrid[i].ip;
                if(ip){
                    if(ips[ip]){
                        ips[ip].push(vm.dataGrid[i]);
                    }else
                        ips[ip] = [vm.dataGrid[i]];
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

        //筛选
        /** 用户定制的筛选函数 */
        vm.filter = function(record){
            if(!vm.filtered.all) {
                if(vm.filtered.present && record.num>0) return true;
                if(vm.filtered.absent && record.num<1) return true;
                return false;
            }else //无筛选条件，一律返回真
                return true;
        };
        vm.filtered = {
            all:true, absent:false, present:false
        };
        /** 修改当前的筛选条件 */
        vm.setFilter = function(key){
            if(key){
                if(key=='absent') vm.filtered.absent = !vm.filtered.absent;
                if(key=='present') vm.filtered.present = !vm.filtered.present;
                if(vm.filtered.absent || vm.filtered.present){
                    //如果两个都没有选择，自动选择全部
                    vm.filtered.all = false;
                }else
                    vm.filtered.all = true;
            }else {
                vm.filtered = {
                    all:true, absent:false,present:false
                };
            }
        };

        //当前的视图
        vm.viewType = 'list';

        //执行统计的请求
        vm.stat = function(){
            if(vm.beginDate==null && vm.endDate==null) return;
            if(vm.pattern==null) return;
            vm.pattern = vm.pattern.trim();
            if(vm.pattern.length<1) return;

            vm.isSuccess = false;
            vm.message = null;
            vm.processing = true;
            vm.data = null;
            vm.dataGrid = null;

            $http.patch('/api/files/', {begin: vm.beginDate, end: vm.endDate
                , pattern: vm.pattern})
                .success(function (data) {
                    if (data) {
                        if (data.success) {
                            vm.isSuccess = true;
                            //为项目视图准备数据
                            vm.data = data.data;
                            //计算总人数和缺交人数
                            vm.data.numExpected = vm.data.detail.length;
                            vm.data.numAbsent = vm.data.numExpected - vm.data.numStudent;

                            //为网格视图准备数据，清楚所有未交作业的学生，仅将上交作业的学生的学号/姓名/ip/时间以及下载
                            //文件的必要资料保存到一个数组中，让页面来负责排序。
                            vm.dataGrid = [];

                            //遍历每一个学生提交的详细文件信息
                            var stu;
                            for(var k=0; k<vm.data.detail.length; k++){
                                //存在至少一个文件，可以参与排名
                                stu = vm.data.detail[k];
                                if(stu.num>0){
                                    vm.dataGrid.push({
                                        _id:stu.info._id,name:stu.info.name,code:stu.info.code
                                        ,ip:stu.file[stu.lastIndex].ip,uploadDate:stu.file[stu.lastIndex].uploadDate
                                        ,fname:stu.file[stu.lastIndex].fname,fullname:stu.file[stu.lastIndex].fullname
                                    });
                                }
                            }
                        } else
                            vm.message = BaseService.formatMessage(data);
                    } else
                        vm.message = '服务器没有返回任何数据';

                    vm.processing = false;
                });
        };

        /** 自动调整日期以确保开始日期早于结束日期 */
        vm.adjustDate = function(isBegin){
            var today;
            if(vm.beginDate>vm.endDate){
                if(isBegin) {//调整开始日期，自动调整结束日期
                    today = vm.beginDate.getFullYear() + '-'
                        + (vm.beginDate.getMonth()+1) + '-'
                        + vm.beginDate.getDate();
                    vm.endDate = new Date(today + ' 23:59');
                }else {
                    today = vm.endDate.getFullYear() + '-'
                        + (vm.endDate.getMonth() + 1) + '-'
                        + vm.endDate.getDate();
                    vm.beginDate = new Date(today + ' 00:00');
                }
            }
        };

    }])

    //文件操作路由
    .controller('fileController',['$location', 'Arrayator', 'ContextService', 'BaseService', 'Auth', 'UtilsService', function($location, Arrayator, ContextService, BaseService, Auth, UtilsService){
        var vm       = this;
        vm.isMoveTo  = false;
        vm.paginator = Arrayator;
        vm.paginator.refresh();
        //当前是否是工作目录，根目录仅允许admin操作，一般用户需要进入各自的工作目录才能操作
        vm.isWorkingDir = (Auth.user.code=='admin')?true:false;

        /** 实现移动，即一个剪切粘贴的过程 */
        vm.moveTo = function(){
            if (vm.move.selections.length < 1){
                vm.isMoveTo = true;
                return;
            }
            //准备需要粘贴的条目 格式：    {_id:'55a66f77b01d7ca00e380ee9',dest:'./aa',fullname:'1.jpg',isFile:true}
            vm.ccp.todos = [];

            //复制一份，避免修改原始的选项
            var src;
            for (var i = 0, len = vm.move.selections.length; i < len; i++) {
                src = vm.move.selections[i];
                vm.ccp.todos.push({_id: src._id, dest: vm.currentDir, fullname: src.fullname, isFile: src.isFile});
            }

            //准备粘贴操作的参数配置项，默认不能改名，也不能覆盖，需要用户来确定
            vm.pasteConfig = {isCut: true, needRename: false, overWrite: false, user: Auth.user._id
                , needRenameOnce:false, overWriteOnce:false, skip:false, skipOnce:false, type:'move'};

            //记录因粘贴而改变的记录ID，用于刷新时标记出来给用户看
            vm.idsToBeSelected   = [];
            vm.ccp.progress      = 0;
            vm.ccp.todosTotal    = vm.ccp.todos.length;
            vm.ccp.todosFinished = 0;
            vm.progressing       = true;
            //触发粘贴过程
            vm.pasteGo();
        };

        /** 取消移动，返回文件管理器 */
        vm.moveExit = function(){
            vm.isMoveTo        = false;
            //恢复当前目录，恢复当前选中的文件和文件夹，恢复导航信息
            vm.idsToBeSelected = [];
            for(var i= 0,len= vm.move.selections.length; i<len; i++){
                vm.idsToBeSelected.push(vm.move.selections[i]._id);
            }
            vm.pathHistory      = vm.move.pathHistory;
            vm.pathHistoryIndex = vm.move.pathHistoryIndex;
            vm.currentDir       = vm.move.sourceDir;
            vm.refresh();
        };

        /** 选择的文件和文件夹移动到其他目录 */
        vm.move = function(){
            if(vm.isMoveTo) return;
            if(!vm.isWorkingDir) return;

            //保存好当前的一下状态信息：当前目录位置，当前选中的条目的Todos信息，导航信息
            var d;
            vm.move.sourceDir  = vm.currentDir;
            vm.move.selections = [];
            vm.move.paths      = [];
            vm.move.files      = 0;
            vm.move.dirs       = 0;
            for(var i= 0,len= vm.paginator.data.length; i<len; i++){
                d = vm.paginator.data[i];
                if(d.selected) {
                    vm.move.selections.push({_id:d._id,fullname: d.fullname,isFile: d.isFile});
                    if(d.isFile)
                        vm.move.files++;
                    else {
                        vm.move.dirs++;
                        vm.move.paths.push(vm.currentDir + '/' + d.name);
                    }
                }
            }
            vm.move.pathHistory = [];
            for(var i= 0,len = vm.pathHistory.length; i<len; i++){
                vm.move.pathHistory.push(vm.pathHistory[i]);
            };
            vm.move.pathHistoryIndex = vm.pathHistoryIndex;
            vm.isMoveTo = true;
            vm.refresh();
        };

        //显示删除动作前的确认窗口，准备显示的信息
        vm.modalDelete = function(record){
            if(vm.isMoveTo) return;
            if(!vm.isWorkingDir) return;

            vm.deleteInfo = {};
            var size;
            if(record){ //单个删除
                vm.deleteInfo.isSingle = true;
                vm.deleteInfo.detail   = null;
                var item = {id:record._id};
                if(record.isFile)
                    vm.deleteInfo.title = '一个文件';
                else {
                    item.name = record.name;
                    vm.deleteInfo.title = '一个文件夹';
                }
                vm.deleteInfo.subtitle = 'ID：' + record._id;
                if(record.isFile) {
                    if (record.size < 1024)
                        size = record.size + 'B';
                    else if (record.size < (1024 * 1024))
                        size = (record.size / 1024).toFixed(2) + 'KB';
                    else
                        size = (record.size / (1024 * 1024)).toFixed(2) + 'MB';
                    vm.deleteInfo.detailShort = '名称：' + record.fullname + '    大小：' + size;
                }else
                    vm.deleteInfo.detailShort = '名称：' + record.name;
                vm.deleteInfo.idNames = [item];
            }else{//批量删除
                vm.deleteInfo.isSingle = false;
                var numFiles           = 0;
                var numDirs            = 0;
                var idNames            = [];
                var detail             = '';
                for(var i in vm.paginator.data){
                    if(vm.paginator.data[i].selected){
                        if(vm.paginator.data[i].isFile){
                            numFiles++;
                            detail += ', ' + vm.paginator.data[i].fullname;
                            idNames.push({id:vm.paginator.data[i]._id});
                        }else{
                            numDirs++;
                            detail += ', ' + vm.paginator.data[i].name;
                            idNames.push({id:vm.paginator.data[i]._id, name:vm.paginator.data[i].name});
                        };
                    }
                }
                if(detail.length>102) {
                    vm.deleteInfo.detail = '名称：' + detail.substring(2);
                    //一个简版仅显示前固定长度的简称，便于应对较长的文件名列表
                    vm.deleteInfo.detailShort = '名称：' + detail.substr(2, 100) +  ' ...';
                }else {
                    vm.deleteInfo.detail = null;
                    vm.deleteInfo.detailShort = '名称：' + detail.substring(2);
                }

                vm.deleteInfo.idNames = idNames;
                vm.deleteInfo.title = ((numFiles>0)?(numFiles + '个文件'):(''))
                    + ((numDirs>0)?(numDirs + '个文件夹'):(''));
            }
            $("#modalDelete").modal();
        };

        /** 删除指定的文件(夹)和批量删除 */
        vm.delete = function(){
            for(var len=vm.deleteInfo.idNames.length,i=len-1; i>-1; i--){
                if(vm.deleteInfo.idNames[i].name){//目录删除
                    BaseService.deleteFolder(vm.deleteInfo.idNames[i].id,vm.currentDir + '/' + vm.deleteInfo.idNames[i].name,false).success(function (data) {
                    });
                }else {//文件删除
                    BaseService.delete(vm.deleteInfo.idNames[i].id).success(function (data) {
                    });
                }
            }
            //更新视图
            if(vm.deleteInfo.isSingle){
                //单个删除，需要匹配ID
                var idName = vm.deleteInfo.idNames[0];
                for (var i in vm.paginator.data) {
                    if (vm.paginator.data[i]._id === idName.id) {
                        vm.paginator.data.splice(i,1);
                        vm.setSelection(-1);
                        break;
                    }
                }
            }else {//批量删除，直接把没有选中的记录保留下来即可
                var newData = [];
                for (var i in vm.paginator.data) {
                    if (!vm.paginator.data[i].selected) {
                        newData.push(vm.paginator.data[i]);
                    }
                }
                vm.paginator.data   = newData;
                vm.numSelectedDirs  = 0;
                vm.numSelectedFiles = 0;
            }
        };

        /** 更名前的本地目录重复检查 */
        vm.renameCheck = function(record, newName){
            //只要发现类型与当前对象一致，而且名称相同就属于重复，则不能改名
            for(var i= 0,len=vm.paginator.data.length; i<len; i++){
                if(vm.paginator.data[i].extension == record.extension && vm.paginator.data[i].name == newName)
                    return false;
            }
            return true;
        };

        /** 文件或者文件夹改名 */
        vm.rename = function(record) {
            var name = prompt("请输入新的文件（夹）名：", record.name);
            if (name){
                    name = name.trim();
                    if(name && name.match(/^(?!\.)[^\\\/:\*\?"<>\|]{1,255}$/)){
                        if(record.name != name) {//是否改动了文件名
                            if(vm.renameCheck(record, name)){//还要看看是否与当前目录的其他文件或文件夹同名
                                var oldName = record.name;
                                async.waterfall([
                                    function(callback){
                                        if(record.isFile)
                                            callback(null);
                                        else
                                        //目录改名先要修改所有的子文件夹和目录的路径
                                            BaseService.renameFolder(vm.currentDir, oldName, name).success(function (data) {
                                                callback(null);
                                            });
                                    },
                                    function(callback){
                                        var renameTime = Date.now();
                                        var history = {name: Auth.user._id, date:renameTime, type: 'rename', remark: '原名：' + record.name};
                                        BaseService.update({_id: record._id, name: name, history: history}).success(function (data) {
                                            record.history.unshift(history);
                                            record.username = vm.usersDic[history.name];
                                            record.lastModified = history.date;
                                            record.name = name;
                                            if(record.isFile)
                                                record.fullname = name + '.' + record.extension;
                                            else
                                                record.fullname = name;
                                            callback(null);
                                        });
                                    }
                                    ,function(callback){
                                        if(!record.isFile){//最后修改pathHistory中出现的有关目录
                                            oldName = vm.currentDir + '/' + oldName;
                                            var l = oldName.length;
                                            for(var i= 0,len=vm.pathHistory.length; i<len; i++){
                                                if(vm.pathHistory[i]==oldName) //改名前目录
                                                    vm.pathHistory[i]=vm.currentDir + '/' + name;
                                                else if(vm.pathHistory[i].indexOf(oldName + '/')==0){ //改名前子目录
                                                    vm.pathHistory[i]=vm.currentDir + '/' + name + vm.pathHistory[i].substring(l);
                                                }
                                                //console.log('Path at ',i,'-th = ',vm.pathHistory[i]);
                                            }
                                        }
                                        callback(null);
                                    }
                                ],function(){
                                    //console.log('exit?');
                                });
                            }else{
                                if(record.isFile)
                                    alert(name + '与当前目录的其他文件同名，改名失败！');
                                else
                                    alert(name + '与当前目录的其他文件夹同名，改名失败！');
                            }
                        }
                    }else
                        alert(name + '不是合法的文件名：文件名不能为空，不能包含/\\:*?\"<>|,并且不能以.开头或结尾');
                }
        };

        /** 新建文件夹 */
        vm.createDir = function() {
            if(vm.isMoveTo) return;
            if(!vm.isWorkingDir) return;

            var name = prompt("请输入新的文件夹名：", '');
            if (name){
                name = name.trim();
                if(name && name.match(/^(?!\.)[^\\\/:\*\?"<>\|]{1,255}$/)){
                    var createDirTime = Date.now();
                    var history = {name:Auth.user._id, date:createDirTime, type:'create'};
                    var record = {path:vm.currentDir,isFile:false,name:name,history:[history],extension:'folder'};
                    if(vm.renameCheck(record, name)) {
                        BaseService.create(record).success(function (data) {
                            record.username = vm.usersDic[history.name];
                            record.lastModified = history.date;
                            record.size     = 0;
                            record.icon     = 'folder';
                            record._id      = data._id;
                            record.fullname = name;
                            vm.paginator.data.unshift(record);
                            vm.refresh();
                        });
                    }else{
                        alert(name + '与当前目录的其他文件夹同名，新建文件夹失败！');
                    }
                }else
                    alert(name + '不是合法的文件夹名：文件夹名不能为空，不能包含/\\:*?\"<>|,并且不能以.开头或结尾');
            }
        };

        /** 执行选择动作、其中selType=1表示全选，selType=0全不选，selType=-1反选 */
        vm.select = function(selType){
            vm.numSelectedDirs = 0;
            vm.numSelectedFiles = 0;
            if(selType == 1) {
                for (var i in vm.paginator.data) {
                    vm.paginator.data[i].selected = true;
                    if(vm.paginator.data[i].isFile)
                        vm.numSelectedFiles ++;
                    else
                        vm.numSelectedDirs ++;
                }
            }else if(selType == 0) {
                for (var i in vm.paginator.data) {
                    vm.paginator.data[i].selected = false;
                }
            }else if(selType == -1) {
                for (var i in vm.paginator.data) {
                    vm.paginator.data[i].selected = !vm.paginator.data[i].selected;
                    if(vm.paginator.data[i].selected) {
                        if (vm.paginator.data[i].isFile) vm.numSelectedFiles++;
                        else vm.numSelectedDirs ++;
                    }
                }
            }
        };

        /** 筛选动作 */
        vm.filter = function(event){
            vm.paginator.filter(event);
            vm.setSelection(-1);
        };

        /**  批量下载 */
        vm.multiDownload = function() {
            var files = [];
            for(var i in vm.paginator.data){
                if(vm.paginator.data[i].isFile && vm.paginator.data[i].selected){
                    files.push({name:'public/uploads/'+vm.paginator.data[i].fname
                    ,rename:vm.paginator.data[i].fullname});
                }
            }

            if(files.length>0)
                multiDownload(files);
        };

        //单个文件下载，其下载的动作由超链接自动执行，这里仅仅在数据库里面备注一次操作记录
        vm.recordDownload = function(record){
            var history = {name:Auth.user._id,type:'download'};
            BaseService.update({_id:record._id,history:history}).success(function (data) {
                //成功后修改本地数据
                history.date = new Date();
                record.history.unshift(history);
                record.username = vm.usersDic[history.name];
            });
        };

        //获取数据后的处理动作
        vm.paginator.format = function(data){
            vm.numSelectedDirs  = 0;
            vm.numSelectedFiles = 0;

            //计算图表显示式样
            for (var i in data) {
                if (data[i].isFile) {
                    if(data[i].extension.match(/(doc|docx)/))
                        data[i].icon = 'file-word-o';
                    else if(data[i].extension.match(/(txt)/))
                        data[i].icon = 'file-text-o';
                    else if(data[i].extension.match(/(ppt|pptx)/))
                        data[i].icon = 'file-powerpoint-o';
                    else if(data[i].extension.match(/(xls|xlsx)/))
                        data[i].icon = 'file-excel-o';
                    else if(data[i].extension.match(/(gif|jpg|jpeg|png|tif|tiff|gif|bmp|ico|psd)/))
                        data[i].icon = 'file-image-o';
                    else if(data[i].extension.match(/(htm|html|mht)/))
                        data[i].icon = 'html5';
                    else if(data[i].extension.match(/(css)/))
                        data[i].icon = 'css3';
                    else if(data[i].extension.match(/(c|cc|cpp)/))
                        data[i].icon = 'file-code-o';
                    else if(data[i].extension.match(/(zip|rar|7z|iso)/))
                        data[i].icon = 'file-zip-o';
                    else if(data[i].extension.match(/(rmvb|avi|mp4|flv|mkv|wmv|3gp|rm|ogg|webm)/))
                        data[i].icon = 'file-video-o';
                    else if(data[i].extension.match(/(mp3|wav)/))
                        data[i].icon = 'file-audio-o';
                    else if(data[i].extension.match(/(pdf)/))
                        data[i].icon = 'file-pdf-o';
                    else if(data[i].extension.match(/(exe|msi)/))
                        data[i].icon = 'windows';
                    else
                        data[i].icon = 'file';
                } else {
                    data[i].icon = 'folder';
                }
                data[i].username = vm.usersDic[data[i].history[0].name];
                //格式化大小显示
                data[i].sizeB = UtilsService.toFileSizeWithUnit(data[i].size);

                //上传，粘贴和移动成功后第一次选中新变动的元素
                if(vm.idsToBeSelected && vm.idsToBeSelected.length>0){
                    var pos = vm.idsToBeSelected.indexOf(data[i]._id);
                    if(pos>-1){
                        data[i].selected = true;
                        if(data[i].isFile)
                            vm.numSelectedFiles ++;
                        else
                            vm.numSelectedDirs ++;
                        vm.idsToBeSelected.splice(pos,1);
                    }
                }
            }

            vm.idsToBeSelected = null;
            return data;
        };

        //目前支持的操作类型，需要与api里面对files数据表操作的history类型保持一致  apiRouter.use(multer(...
        vm.typesDic = {
            'upload':'上传'
            ,'move':'移动'
            ,'copy':'复制'
            ,'cut':'剪切'
            ,'paste':'粘贴'
            ,'replace':'替换'
            ,'rename':'改名'
            ,'download':'下载'
            ,'create':'新建'
        };

        //文件的显示图标取决于扩展名
        vm.extensions = [
             {label:'网页',name:'html|htm|mht'}
            ,{label:'图片',name:'gif|jpg|jpeg|png|tif|tiff|gif|bmp|ico|psd'}
            ,{label:'音频',name:'mp3|wav'}
            ,{label:'视频',name:'rmvb|avi|mp4|flv|mkv|wmv|3gp|rm|ogg|webm'}
            ,{label:'软件',name:'exe|msi'}
            ,{label:'源代码',name:'c|cc|cpp|css'}
            ,{label:'文件夹',name:'folder'}
            ,{label:'文本文件',name:'txt'}
            ,{label:'压缩文件',name:'zip|rar|7z|iso'}
            ,{label:'pdf文件',name:'pdf'}
            ,{label:'ppt文件',name:'ppt|pptx'}
            ,{label:'word文件',name:'doc|docx'}
            ,{label:'excel文件',name:'xls|xlsx'}
            ,{label:'其他',name:'file'}
        ];

        //显示文件的修改历史，
        vm.showHistory = function(record){
            vm.history = record;
            //准备显示用户名和操作类型
            for(var i in record.history){
                record.history[i].username = vm.usersDic[record.history[i].name];
                record.history[i].typename = vm.typesDic[record.history[i].type];
            }
            $("#modalHistory").modal();
        };

        vm.paginator.customFilter = {
            name:{
                show:false
                ,type:'text'
                ,value:''
            }
            ,extension:{
                show:false
                ,type:'select'
                ,value:''
            }
            ,size:{
                show:false
                ,type:'number'
                ,value:0
            }
            ,username:{
                show:false
                ,type:'select'
                ,value:''
            }
            ,lastModified:{
                show:false
                ,type:'date'
                ,value:''
            }
        };
        //记录排序的字段名称和方向
        //默认第一次按名称的升序排列
        vm.paginator.sortColumn = 'name';

        BaseService.setEntity('users');
        BaseService.all()
            .success(function (data) {
                vm.users = [];
                vm.usersDic = {};
                if(data) {
                    for (var i in data) {
                        vm.users.push({id:data[i]._id,name:data[i].name});
                        vm.usersDic[data[i]._id] = data[i].name;
                    }
                }

                //确保获取用户数组后再查询文件列表
                vm.paginator.entity.setEntity('files');
                vm.refresh();
            });

        /** 刷新动作 */
        vm.refresh = function(){
            if(Auth.user.code!='admin' && vm.currentDir=='.'){
                //一般用户在浏览根目录时，仅显示根目录的文件和他自己的工作目录
                //隐藏其他用户的工作目录
                //筛选条件是 或者不是目录，或者名称=code
                vm.paginator.criteria = {path : vm.currentDir, isDelete:null, $or:[{isFile:true},{name:Auth.user.code}]};
            }else
                vm.paginator.criteria = {path : vm.currentDir, isDelete:null};
            if(vm.isMoveTo) //移动到视图时，仅显示目录
                vm.paginator.criteria['isFile'] = false;
            async.waterfall([
                function(callback){
                    vm.paginator.retrieveData(callback);
                },
                function(callback){
                    if(vm.paginator.errMessage){
                        alert(vm.paginator.errMessage);
                        vm.jumpPath('.');
                    }else{
                        vm.setSelection(-1);
                        vm.selectBegin = 0;
                        vm.setValidPath();
                    }
                    callback(null);
                }
            ], function(err, result){
            });
        };

        vm.numSelectedDirs  = 0;
        vm.numSelectedFiles = 0;
        /** 实时统计选中的个数 */
        vm.setSelection = function(file, event){
            if(!vm.paginator.data) return;
            var index = -1;
            for (var i= 0,len=vm.paginator.data.length; i<len; i++) {
                if(vm.paginator.data[i] == file) {
                    index = i;
                    break;
                }
            }
            if(index<0) { //重新统计被选中的文件和文件数量
                vm.numSelectedDirs  = 0;
                vm.numSelectedFiles = 0;
                for (var i= 0,len=vm.paginator.data.length; i<len; i++) {
                    if(vm.paginator.data[i].selected){
                        if (vm.paginator.data[i].isFile)
                            vm.numSelectedFiles++;
                        else
                            vm.numSelectedDirs++;
                    }
                }
            }else if(event.shiftKey) {//Shift+Click, 连续选择
                if(!vm.selectBegin) vm.selectBegin = 0;
                var selMin = vm.selectBegin;
                var selMax = index;
                if(selMin>selMax){
                    selMax = vm.selectBegin;
                    selMin = index;
                }
                vm.numSelectedDirs  = 0;
                vm.numSelectedFiles = 0;
                for (var i= 0,len=vm.paginator.data.length; i<len; i++) {
                    if(i<selMin)
                        vm.paginator.data[i].selected = false;
                    else if(i>selMax)
                        vm.paginator.data[i].selected = false;
                    else {
                        vm.paginator.data[i].selected = true;
                        if (vm.paginator.data[i].isFile)
                            vm.numSelectedFiles++;
                        else
                            vm.numSelectedDirs++;
                    }
                }
            }else{
                vm.selectBegin = index;
                if(event.ctrlKey){ //Ctrl+Click，不连续选择
                    //点击某一行，改变改行的被选中属性
                    if(vm.paginator.data[index].selected) {
                        if (vm.paginator.data[index].isFile)
                            vm.numSelectedFiles--;
                        else
                            vm.numSelectedDirs--;
                    }else{
                        if (vm.paginator.data[index].isFile)
                            vm.numSelectedFiles++;
                        else
                            vm.numSelectedDirs++;
                    }
                    vm.paginator.data[index].selected = !vm.paginator.data[index].selected;
                }else{//不带Shift，Ctrl的单击，仅仅选中当前条目，其他都不选
                    for (var i= 0,len=vm.paginator.data.length; i<len; i++) {
                        if(i==index) {
                            if(vm.paginator.data[i].selected){
                                vm.paginator.data[i].selected = false;
                                vm.numSelectedDirs  = 0;
                                vm.numSelectedFiles = 0;
                            }else {
                                vm.paginator.data[i].selected = true;
                                vm.selectBegin = i;
                                if (vm.paginator.data[i].isFile) {
                                    vm.numSelectedDirs  = 0;
                                    vm.numSelectedFiles = 1;
                                } else {
                                    vm.numSelectedDirs  = 1;
                                    vm.numSelectedFiles = 0;
                                }
                            }
                        }else
                            vm.paginator.data[i].selected = false;
                    }
                }
            }
        };

        /**重置选中标记*/
        vm.clearSelection = function () {
            for(var i=0,len=vm.paginator.data.length; i<len; i++){
                if(vm.paginator.data[i].selected)
                    vm.paginator.data[i].selected = false;
            }
        }

        /** CCP操作，即复制剪切粘贴操作 */
        vm.copyCut = function(isCut){
            if(vm.isMoveTo) return;
            if(isCut && !vm.isWorkingDir) return;

            vm.ccp.files      = 0;
            vm.ccp.dirs       = 0;
            vm.ccp.isCut      = isCut;
            vm.ccp.selections = [];
            vm.ccp.paths      = [];
            vm.ccp.sourceDir  = vm.currentDir;
            vm.setValidPath();
            var d;
            for(var i= 0,len= vm.paginator.data.length; i<len; i++){
                d = vm.paginator.data[i];
                if(d.selected) {
                    vm.ccp.selections.push({_id:d._id,fullname: d.fullname,isFile: d.isFile, size: d.size});
                    if(d.isFile)
                        vm.ccp.files++;
                    else {
                        vm.ccp.dirs++;
                        vm.ccp.paths.push(vm.currentDir + '/' + d.name);
                    }
                }
            }
        };

        /** 粘贴动作 */
        vm.paste = function() {
            if(vm.isMoveTo) return;
            if(!vm.isWorkingDir) return;

            if (vm.ccp.selections.length < 1) return;
            //准备需要粘贴的条目 格式：    {_id:'55a66f77b01d7ca00e380ee9',dest:'./aa',fullname:'1.jpg',isFile:true}
            vm.ccp.todos = [];

            //当前目录复制到当前目录默认是全部改名，这里仅仅标记顶层文件和目录
            var isBackup = (!vm.ccp.isCut && vm.ccp.sourceDir == vm.currentDir);

            //复制一份，避免修改原始的选项
            var src;
            for (var i = 0, len = vm.ccp.selections.length; i < len; i++) {
                src = vm.ccp.selections[i];
                vm.ccp.todos.push({_id: src._id, dest: vm.currentDir, fullname: src.fullname, isFile: src.isFile, isBackup:isBackup, size:src.size});
            }

            //准备粘贴操作的参数配置项，默认不能改名，也不能覆盖，需要用户来确定
            vm.pasteConfig = {isCut: vm.ccp.isCut, needRename: false, overWrite: false, user: Auth.user._id
                , needRenameOnce:false, overWriteOnce:false, skip:false, skipOnce:false, type:((vm.ccp.isCut)?'cut':'copy')};

            //记录因粘贴而改变的记录ID，用于刷新时标记出来给用户看
            vm.idsToBeSelected   = [];
            vm.ccp.progress      = 0;
            vm.ccp.todosTotal    = vm.ccp.todos.length;
            vm.ccp.todosFinished = 0;
            vm.progressing       = true;
            //触发粘贴过程
            vm.pasteGo();
        };

        /** 由于目录的粘贴具有连锁反应，目录的子目录需要循环递归执行粘贴动作
         * 这个过程负责将目录的直接子目录和文件压入元素队列 */
        vm.pastePush = function(data,neuDest){
            /** 目标目录 等于 将原始目录位置中srcRoot部分用currentDir替换
             * 例如：./a   复制到  ./b/cd 中
             * 而./a的目录结构为：      ./a/x, ./a/x/t, ./a/pp.png (前两个是目录，后者是文件)
             * 则目标位置应分别是：     ./b/cd/a/x, ./b/cd/a/x/t, ./b/cd/a/pp.png
             * 有一个例外是当前目录复制和粘贴，这样会出现一个新的备份目录，如
             * 例如：./a/c   复制到  ./a 中会产生一个"./a/c - 备份"的目录
             * 而./a/c的目录结构为：      ./a/c/x, ./a/c/x/t, ./a/c/pp.png (前两个是目录，后者是文件)
             * 则目标位置应分别是：     ./a/c - 备份/x, ./a/c - 备份/x/t, ./a/c - 备份/pp.png
             * 由于这种情况仅发生在当前目录的一个层次上，所以替换模式是：currentDir + oldName 替换为 currentDir + newName
             */
            //由于这一批属于同一个目录，只需要求出一个目标目录就可以
            var len = data.length;
            for (var i = 0; i < len; i++) {
                vm.ccp.todos.push({_id: data[i]._id, dest: neuDest, fullname: data[i].fullname, isFile: data[i].isFile, size:data[i].size});
            }
            vm.ccp.todosTotal += len;
        };

        /** 准备好粘贴的参数和初始队列后的粘贴过程
         * 这个过程可能会因为重名的原因中断，需要用户介入
         * 用户可能会继续这个过程，例如允许一次改名等
         * 所以这个过程需要设计成可以任意重复执行的片段 */
        vm.pasteGo = function(){
            //是否执行了最后的页面刷新动作标志
            var isRefreshed = false;
            var todoItem;

            //准备容量检测
            vm.diskSize         = 0;
            vm.usedSize         = 0;
            vm.allowedSize      = 0;
            vm.sizeInterruptted = false;

            //执行粘贴队列，以及最后的刷新动作，这些需要串行执行
            async.waterfall([function(callback) {
                BaseService.setEntity('users');
                    BaseService.get(Auth.user._id)
                        .success(function (data) {
                            vm.sizeInterruptted = true;
                            if (data.success && data.data) {
                                vm.diskSize    = data.data.diskSize;
                                vm.usedSize    = data.data.usedSize;
                                vm.allowedSize = vm.diskSize - vm.usedSize;
                                if (vm.usedSize <= vm.diskSize) {
                                    vm.sizeInterruptted = false;
                                    callback(null);
                                } else {
                                    callback('错误容量：' + UtilsService.toFileSizeWithUnit(vm.allowedSize));
                                }
                            } else {
                                callback('查询容量失败'+data);
                            }
                        });
            }, function(callback){
                BaseService.setEntity('files');
                async.whilst(
                    function() { return vm.ccp.todos.length>0 || !isRefreshed; },
                    function(cb) {
                        if (vm.pasteConfig.userInterruptted)
                            cb('UserInterrupted');
                        else if(vm.ccp.todos.length>0) { //还有队列没有执行
                            todoItem                = vm.ccp.todos.shift();
                            vm.pasteConfig.dest     = todoItem.dest;
                            vm.pasteConfig.fullname = todoItem.fullname;
                            vm.pasteConfig.isFile   = todoItem.isFile;
                            vm.pasteConfig.isBackup = todoItem.isBackup;

                            //检测容量
                            if(Auth.user.code != 'admin' && !vm.pasteConfig.isCut
                                && vm.pasteConfig.isFile){
                                var sizeFinished = vm.usedSize + todoItem.size;
                                if(sizeFinished>vm.diskSize){
                                    vm.sizeInterruptted = true;
                                    cb('容量超过限制，不能执行粘贴动作');
                                    return;
                                }
                            }

                            BaseService.paste(todoItem._id, {config: vm.pasteConfig}).success(function (data) {
                                //执行数据库的粘贴有几种结果，
                                // 1. 成功（含不重名、重名改名、重名覆盖）
                                // 2. 发现重名并没有对策
                                if (data.success) {
                                    //继续下一步操作
                                    if (todoItem.dest == vm.currentDir) //仅保留当前目录下的新元素，深层次的元素不可能会显示
                                        vm.idsToBeSelected.push(data._id);
                                    vm.ccp.todosFinished++;

                                    //粘贴目录还需要处理其下的所有文件和文件夹
                                    if(!todoItem.isFile && data.data.length>0){
                                        //将所含的子目录都放入要处理的元素队列中
                                        vm.pastePush(data.data, data.neuDest);
                                    }

                                    vm.ccp.progress = (vm.ccp.todosFinished * 100 / vm.ccp.todosTotal).toFixed(0);
                                    //清除一次性的允许改名和覆盖的选项
                                    vm.pasteConfig.needRenameOnce = false;
                                    vm.pasteConfig.overWriteOnce  = false;
                                    if (vm.pasteConfig.userInterruptted){
                                        cb('UserInterrupted');
                                    }else cb();
                                } else {//弹出错误以停止当前的粘贴过程
                                    cb('ServerError');
                                }
                            });
                        }else{//队列执行完毕，还要刷新视图
                            if(vm.isMoveTo){ //由移动中取消操作，需要还原部分配置信息。
                                vm.isMoveTo         = false;
                                vm.pathHistory      = vm.move.pathHistory;
                                vm.pathHistoryIndex = vm.move.pathHistoryIndex;
                                vm.addHistory(); //当前的路径成为路径历史的最后一项
                            }
                            vm.refresh();
                            vm.progressing = false;
                            isRefreshed    = true;
                            //cb('Refreshed');
                        }
                    },
                    function(err) {
                        if(vm.sizeInterruptted || vm.pasteConfig.userInterruptted){//容量检测或被用户中断
                            vm.pasteCancel();
                        }else {
                            //为了下次还能处理本次中断时的对象，将todoItem压回队列的队首
                            vm.ccp.todos.unshift(todoItem);
                            $('#modalPaste').modal({"backdrop": "static"});
                        }
                        callback(err);
                    }
                );}], function (err, result) {
                alert('粘贴错误：'+err);
            });
        };

        /** 用户可以直接中断粘贴过程，也可以在提示重复处理方案时取消 */
        vm.pasteCancel = function(){
            vm.pasteConfig.userInterruptted = false;
            vm.ccp.todos = [];
            if(vm.isMoveTo){ //由移动中取消操作，需要还原部分配置信息。
                vm.isMoveTo = false;
                vm.pathHistory = vm.move.pathHistory;
                vm.pathHistoryIndex = vm.move.pathHistoryIndex;
                vm.addHistory(); //当前的路径成为路径历史的最后一项
            }

            vm.refresh();
            vm.progressing = false;
        };

        /** 用户对重名的解决办法 */
        vm.pasteModal = function(prop){
            //记录用户的选择
            vm.pasteConfig.needRename     = false;
            vm.pasteConfig.needRenameOnce = false;
            vm.pasteConfig.overWrite      = false;
            vm.pasteConfig.overWriteOnce  = false;
            vm.pasteConfig.skip           = false;
            vm.pasteConfig.skipOnce       = false;
            vm.pasteConfig[prop]          = true;

            //继续下一步粘贴或移动操作
            if(vm.pasteConfig.skip) //如果跳过，第一个元素肯定无需再检查重名了，肯定重名
                vm.ccp.todos.shift();
            else if(vm.pasteConfig.skipOnce) { //如果跳过一次，也可以忽略第一个元素
                vm.ccp.todos.shift();
                vm.pasteConfig.skipOnce = false;
            }
            vm.pasteGo();
        };

        /** 查看当前目录是否是合法的粘贴目录：
         * 粘贴目录合法当且仅当：当前目录不是需要拷贝或者复制目录的子目录，在剪切模式下不能是剪切目录 */
        vm.isValidPastePath = false;
        vm.setValidPath = function(){
            if(vm.isMoveTo){
                if(vm.move.sourceDir == vm.currentDir) {
                    vm.isValidPastePath = false;
                    return;
                }
                //扫描每一个需要移动的目录，当前目录不能是这些目录或者子目录
                for(var i= 0,len=vm.move.paths.length;i<len;i++){
                    if(vm.currentDir == vm.move.paths[i] || vm.currentDir.indexOf(vm.move.paths[i]+'/')==0) {
                        vm.isValidPastePath = false;
                        return;
                    }
                }
                vm.isValidPastePath = true;
            }else {
                if (vm.ccp.isCut && vm.ccp.sourceDir == vm.currentDir) {
                    vm.isValidPastePath = false;
                    return;
                }
                //扫描每一个需要粘贴的目录，当前目录不能是这些目录或者子目录
                for (var i = 0, len = vm.ccp.paths.length; i < len; i++) {
                    if (vm.currentDir == vm.ccp.paths[i] || vm.currentDir.indexOf(vm.ccp.paths[i] + '/') == 0) {
                        vm.isValidPastePath = false;
                        return;
                    }
                }
                vm.isValidPastePath = true;
            }
        };

        /** 进入其他窗口前的参数保存 */
        vm.saveContext = function(){
            ContextService.set('files.currentDir', vm.currentDir);
            ContextService.set('files.paths', vm.paths);
            ContextService.set('files.pathHistory', vm.pathHistory);
            ContextService.set('files.pathHistoryIndex', vm.pathHistoryIndex);
            ContextService.set('files.ccp', vm.ccp);
        };

        /** 回到窗口后恢复离开时的状态 */
        vm.readContext = function(){
            vm.currentDir = ContextService.pop('files.currentDir');
            //当前目录是工作目录的条件是：管理员，或者目录路径=用户的代码目录
            var p = ('./' + Auth.user.code);
            var pReg = (p+'/').replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
            vm.isWorkingDir = (Auth.user.code=='admin'
                || vm.currentDir == p
                || vm.currentDir.match('^(' + pReg + ')'));
            vm.paths            = ContextService.pop('files.paths');
            vm.pathHistory      = ContextService.pop('files.pathHistory');
            vm.pathHistoryIndex = ContextService.pop('files.pathHistoryIndex');
            vm.idsToBeSelected  = ContextService.pop('files.idsToBeSelected');
            vm.ccp              = ContextService.pop('files.ccp');
        };

        //如果从其他页面回来，恢复显示离开时的页面，否则显示根目录的内容
        var currentDir = ContextService.get('files.currentDir');
        if(currentDir){
            vm.readContext();
        }else {
            vm.paths            = [{path: '.', label: '网盘', isItem: true}];
            vm.pathHistory      = ['.'];
            vm.pathHistoryIndex = 0;
            vm.currentDir       = '.';
            vm.idsToBeSelected  = null;
            vm.ccp              = {selections: [], files: 0, dirs: 0, isCut: false, paths: [], currentDir: '.'};
        }

        /** 按照上面的格式重新编辑paths */
        vm.formatPaths = function(path, dirName){
            if(dirName) {//进入下一级目录，路径数组增加一个元素
                var neuItem = {path: path, label: dirName, isItem: true};
                if (vm.paths.length > 3) {//大于四级需要合并第二项开始的路径
                    var third = vm.paths.splice(2, 1);
                    if (vm.paths[1].isItem) {//第二项是单项，不是数组，变成数组
                        //由第三项和第二项合并成数组，成为新的第二项
                        var second = {path: [third[0], vm.paths.splice(1, 1)[0]],isItem:false};
                        vm.paths.splice(1, 0, second);
                    } else {//在数组中增加一项
                        vm.paths[1].path.unshift(third[0]);
                    }
                }
                vm.paths.push(neuItem);
            }else{//跳转到上一级的某个路径，需要删除若干个元素
                //从头开始定位当前路径
                var p = [];
                var hasPopup = vm.paths.length>3 && !vm.paths[1].isItem;
                for(var i= 0,len= vm.paths.length; i<len; i++){
                    if(i==1 && hasPopup){//进入数组
                        var foundPath = false;
                        var lenPopup  = vm.paths[1].path.length;
                        for(var j=lenPopup- 1;j>-1;j--){
                            p.push(vm.paths[1].path[j]);
                            if(path == vm.paths[1].path[j].path){
                                foundPath = true;
                                break;
                            }
                        }
                        if(foundPath) break;
                    }else{
                        p.push(vm.paths[i]);
                        if(path == vm.paths[i].path) break;
                    }
                }
                //整理数组，看是否需要把第二元素变成数组
                if(p.length>4){
                    var second = p.splice(1, p.length-3);
                    p.splice(1,0,{path:second, isItem:false});
                }
                vm.paths = p;
            }
        }

        /** 退回上一级目录 */
        vm.goUp = function(){
            if(vm.paths.length>1){
                vm.paths.pop();
                //整理数组，看是否需要把第二元素变回元素
                if(vm.paths.length>1 && !vm.paths[1].isItem){
                    //元素肯定能维持4个
                    var temp = vm.paths[1].path.shift();
                    vm.paths.splice(2,0,temp);
                    if(vm.paths[1].path.length<2){
                        //数组只有1个元素，不要保留
                        temp = vm.paths[1].path.shift();
                        vm.paths.splice(1,1,temp);
                    }
                }
                vm.changeCurrentDir(vm.paths[vm.paths.length-1].path, false, null, false);
            }
        };

        /** 记录一个路径的历史记录，不同与前进，那里不需要记录
         * 这里的做法是先删除当前路径索引以后的所有路径（可能是后退以后）
         * 再添加当前路径*/
        vm.addHistory = function(){
            //检查一下是否与当前使用的路径一致，避免加入重复的路径
            if(vm.pathHistory[vm.pathHistoryIndex] == vm.currentDir) return;
            //否则先删除以后的历史路径，即不允许前进了
            var pos = 1+vm.pathHistoryIndex;
            vm.pathHistory.splice(pos, vm.pathHistory.length-pos);
            vm.pathHistory.push(vm.currentDir);
            vm.pathHistoryIndex = vm.pathHistory.length-1;
        };

        /** 退回前一个访问的路径 */
        vm.goBack = function(){
            if(vm.pathHistory.length>0 && vm.pathHistoryIndex>0){
                vm.pathHistoryIndex--;
                vm.changeCurrentDir(vm.pathHistory[vm.pathHistoryIndex], true, null, true);
            }
        };

        /** 访问路径历史记录的下一个路径，这仅发生在goBack后 */
        vm.goForward = function(){
            if(vm.pathHistory.length>0 && vm.pathHistoryIndex<(vm.pathHistory.length-1)){
                vm.pathHistoryIndex++;
                vm.changeCurrentDir(vm.pathHistory[vm.pathHistoryIndex], true, null, true);
            }
        };

        /** 在路径历史中前进和后退所到达的路径没有规律可言，只能分析路径，重新构造路径数组 */
        vm.formatHistoryPath = function(){
            var p = vm.currentDir.split('/');
            var paths = [];
            var accu = '';
            for(var i in p){
                if(i==0) {
                    accu = p[i];
                    paths.push({path: accu, isItem: true, label: '网盘'});
                }else {
                    accu += '/' + p[i];
                    paths.push({path: accu, isItem: true, label: p[i]});
                }
            }
            if(p.length>4){
                var temp = paths.splice(1, p.length-3);
                var second = {path:[],isItem:false}
                while(temp.length>0){
                    second.path.push(temp.pop());
                }
                paths.splice(1,0,second);
            }
            vm.paths = paths;
        };

        /** 改变当前目录，一共有6种方法来改变当前目录
         * 访问历史中：前进、后退、向上；
         * 双击目录行，单击目录名称，在当前位置中选择
         * */
        vm.changeCurrentDir = function(path, needFormatHistory, dirName, needFormatPath){
            vm.currentDir = path;
            //当前目录是工作目录的条件是：管理员，或者目录路径=用户的代码目录
            var p = ('./' + Auth.user.code);
            var pReg = (p+'/').replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
            vm.isWorkingDir = (Auth.user.code=='admin'
                || path == p
                || path.match('^(' + pReg + ')'));
            if(needFormatHistory) {
                vm.formatHistoryPath();
            }else {
                vm.addHistory();
                if(needFormatPath)
                    vm.formatPaths(path, dirName);
            }
            vm.refresh();
        };

        /** 通过选中目录行进入更深层次的指定目录 */
        vm.enterPath = function(dirName){
            //清空搜索条件
            vm.paginator.vagueFind = "";
            vm.changeCurrentDir(vm.currentDir + '/' + dirName, false, dirName, true);
        };

        /** 双击条目的动作 */
        vm.enterPathDbl = function(file){
            //清空搜索条件
            vm.paginator.vagueFind = "";
            //文件夹直接进入
            if(!file.isFile){
                vm.enterPath(file.name);
            }
            //双击文件时根据不同文件格式实现文件预览
            else{
                //取消其他文件选中，设置该文件选中
                vm.clearSelection();
                file.selected = true;
                var extension     = file.extension;
                vm.showFile       = file;
                vm.showFile.rpath = "/public/uploads/"+file.fname;

                //通过bootstrap模态框显示动图
                if(extension=="gif"){
                    $("#modalShowGif").modal();
                }
                //通过bootstrap模态框显示图片
                else if(extension=="jpg"||extension=="jpeg"||extension=="png"||extension=="bmp"||extension=="ico"||
                    extension=="psd"){
                    //通过html的2D画面显示图片，并实现手动缩放
                    var canvas = document.getElementById("canvas");
                    var context = canvas.getContext("2d");
                    //手动缩放条
                    var slider = document.getElementById("scale-range");
                    var image = new Image();
                    //初始比例100%
                    var scale = 1.0;
                    image.src = vm.showFile.rpath;
                    image.onload = function(){
                        //适配画布和图片尺寸
                        //小图直接显示
                        if(image.width <= 570 && image.height <= 320){
                            $("#modalShowGif").modal();
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
                }

                //读取可以以文本形式显示的文件，如txt，html、c++源代码等
                else if(extension=="txt"||extension=="html"||extension=="htm"||extension=="mht"||extension=="cpp"||
                        extension=="c"||extension=="cc"||extension=="css"){
                    var text = $.ajax({
                        type:"GET",
                        url:vm.showFile.rpath,
                        async:false
                    });
                    vm.showFile.text = text.responseText;
                    $("#modalShowTxt").modal();
                }

                //播放音乐文件
                else if(extension=="mp3"||extension=="wav"){
                    var audio = document.getElementById("myAudio");
                    vm.showFile.load = function () {
                        audio.load();
                    }
                    $("#modalShowMusic").modal();
                }

                //播放视频文件
                else if(extension=="mp4"||extension=="ogg"||extension=="webm"){
                    //保存窗口参数
                    vm.saveContext();
                    //传递待播放视频文件信息
                    ContextService.set('showFile',vm.showFile);
                    $location.path('/files/video');
                }

                //pdf文件预览
                else if(extension=="pdf"){
                    $("#modalShowPdf").modal();
                }
                
                //不支持预览文件类型
                else{
                    alert("不支持预览该格式文件！");
                }
            }
        };

        /** 进入上传窗口 */
        vm.upload = function(){
            if(vm.isMoveTo) return;
            if(!vm.isWorkingDir) return;

            vm.saveContext();
            $location.path('/files/uploader');
        };
    }])

    //回收站控制器
    .controller('recycleController',['Auth', 'Arrayator', 'BaseService', function(Auth, Arrayator, BaseService){
        var vm       = this;
        vm.paginator = Arrayator;
        vm.paginator.refresh();

        BaseService.setEntity('users');
        BaseService.all().success(function (data) {
            vm.users    = [];
            vm.usersDic = {};
            if(data) {
                for (var i in data) {
                    vm.users.push({id:data[i]._id,name:data[i].name});
                    vm.usersDic[data[i]._id] = data[i].name;
                }
            }
            //确保获取用户数组后再查询文件列表
            vm.paginator.entity.setEntity('files');
            vm.refresh();
        });

        /** 刷新动作 */
        vm.refresh = function(){
            //非管理员仅仅显示在个人工作目录删除的内容
            vm.paginator.criteria = {path : 'recycle', name:Auth.user.code};
            async.waterfall([
                function(callback){
                    vm.paginator.retrieveData(callback);
                },
                function(callback){
                    if(vm.paginator.errMessage){
                        alert(vm.paginator.errMessage);
                        vm.jumpPath('.');
                    }else{
                        vm.setSelection(-1);
                        vm.selectBegin = 0;
                        vm.setValidPath();
                    }
                    callback(null);
                }
            ], function(err, result){
            });
        };
    }])

    //文件上传控制器
    .controller('uploaderController', ['Auth' , 'AuthToken', 'FileUploader', 'ContextService', 'BaseService', '$location', 'UtilsService', function(Auth, AuthToken, FileUploader, ContextService, BaseService, $location, UtilsService) {
        var vm = this;
		
		//修正FileUploader中删除文件后不能重新选择的问题，这里要注意：
        // isEmptyAfterSelection 的重载和input元素定义时的参数：multiple
        FileUploader.FileSelect.prototype.isEmptyAfterSelection = function() {
            return false;
        };

        vm.currentDir = ContextService.pop('files.currentDir');
        //如果没有设定当前目录，肯定不是从文件管理器转过来的，属于非法操作，转到文件管理器
        if(!vm.currentDir){
            $location.path('/files');
            return;
        }

        //准备用户的容量检测
        vm.sizeInfo     = null;
        vm.allowedSize  = 0;
        vm.allowedSizeB = null;
        if(Auth.user.code!='admin'){
            BaseService.setEntity('users');
            BaseService.get(Auth.user._id)
                .success(function (data) {
                    if(data.success && data.data) {
                        vm.diskSize = data.data.diskSize;
                        vm.usedSize = data.data.usedSize;
                        vm.sizeInfo =
                            '最大容量：' + UtilsService.toFileSizeWithUnit(vm.diskSize)
                            + ' / 已使用：' + UtilsService.toFileSizeWithUnit(vm.usedSize);

                        vm.allowedSize = vm.diskSize - vm.usedSize;
                        if(vm.usedSize<=vm.diskSize){
                            vm.allowedSizeB = UtilsService.toFileSizeWithUnit(vm.allowedSize);
                        }else{
                            vm.allowedSizeB = '错误容量：' + UtilsService.toFileSizeWithUnit(vm.allowedSize);
                        }
                    }else{
                        vm.sizeInfo = data;
                        vm.allowedSizeB = '查询错误';
                    }
                });
        }

        var uploader = vm.uploader = new FileUploader({
            url: '/api/imageUploader'
            ,headers:{'x-access-token':AuthToken.getToken()}
        });

        //默认上传覆盖原有同名文件
        vm.uploadOverwrite = true;
        //在不覆盖情况下需要查询files表
        BaseService.setEntity('files');

        //为防止路径过长的问题，仅显示最后的若干字符
        vm.currentDirShort = vm.currentDir;
        var len = vm.currentDir.length;
        if(len>23){
            vm.currentDirShort = '...' + vm.currentDir.substring(len-20);
        }

        //记录成功上传的文件数量
        vm.numUploaded = 0;
        vm.thumb       = {width:120, height:90,widthGiven:120, heightGiven:90, keepRatio:true, visible: false};
        //改变缩略图尺寸时是否需要保持比例
        vm.changeThumbSize = function(isWidth){
            if(isWidth){
                if(vm.thumb.keepRatio) { //重新计算高度值
                    vm.thumb.height      = vm.thumb.height * vm.thumb.widthGiven / vm.thumb.width ;
                    vm.thumb.heightGiven = vm.thumb.height;
                }
                vm.thumb.width = vm.thumb.widthGiven;
            }else{
                if(vm.thumb.keepRatio) { //重新计算高度值
                    vm.thumb.width      = vm.thumb.width * vm.thumb.heightGiven / vm.thumb.height ;
                    vm.thumb.widthGiven = vm.thumb.width;
                }
                vm.thumb.height = vm.thumb.heightGiven;
            }
        };

        //退回文件管理器，传一个当前目录的参数，使得文件管理器能显示更新后的当前目录
        vm.exit = function(){
            ContextService.set('files.currentDir', vm.currentDir);
            if(vm.idsToBeSelected && vm.idsToBeSelected.length>0)
                ContextService.set('files.idsToBeSelected',vm.idsToBeSelected);
            $location.path('/files');
        };

        uploader.filters.push({
            name: 'allFilter',
            //name: 'imageFilter',
            fn: function(item /*{File|FileLikeObject}*/, options) {
                //var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                //return '|rar|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
                return true;
            }
        });

        //每个上传的文件增加一些参数，便于在服务器端保存到数据库中
        uploader.onAfterAddingFile = function(fileItem) {
            //取得文件的全名，不含扩展名
            var name = fileItem.file.name;

            var pos = name.lastIndexOf('.');
            var extension = null;
            if(pos>0) {
                //确保扩展名小写
                extension = name.substring(pos+1);
                name      = name.substring(0, pos);
            }
            if(extension){
                extension               = extension.toLowerCase();
                fileItem.file.extension = extension;
                fileItem.file.name      = name + '.' + extension;
            }

            //要确保一个文件只能被添加一次
            var foundDuplicate = false;
            for(var i in vm.uploader.queue){
                if(vm.uploader.queue[i]!=fileItem){
                    if(fileItem.file.name===vm.uploader.queue[i].file.name){
                        foundDuplicate = true;
                        break;
                    }
                }
            }
            if(foundDuplicate){
                fileItem.remove();
                return;
            }

            //传入额外的参数供保存到数据库时使用size，name，path，user
            fileItem.formData.push(
                {
                    path: vm.currentDir
                    ,size: fileItem.file.size
                    ,name: name
                    ,user: Auth.user._id
                });
        }
        vm.idsToBeSelected = [];
        uploader.onCompleteItem = function(fileItem, response, status, headers) {
            if(response.isSuccess) {
                //成功上传，更新已使用容量
                vm.usedSize += fileItem._file.size;
                vm.sizeInfo =
                    '最大容量：' + UtilsService.toFileSizeWithUnit(vm.diskSize)
                    + ' / 已使用：' + UtilsService.toFileSizeWithUnit(vm.usedSize);

                vm.allowedSize = vm.diskSize - vm.usedSize;
                if (vm.usedSize <= vm.diskSize) {
                    vm.allowedSizeB = UtilsService.toFileSizeWithUnit(vm.allowedSize);
                } else {
                    vm.allowedSizeB = '错误容量：' + UtilsService.toFileSizeWithUnit(vm.allowedSize);
                }

                vm.numUploaded++;
                vm.idsToBeSelected.push(response.data._id);
            }else
                alert('上传文件[' + JSON.stringify(fileItem) + ']失败: ' + JSON.stringify(response));
        };

        //如果用户不允许覆盖上传文件，则不能上传重名的文件
        //需要通过网络查询上传的文件名是否重复，如果重复，则提醒用户是否删除
        vm.uploadAll = function(){
            //检查上传文件是否超出了容量限制
            if(Auth.user.code!='admin') {
                var sizeToUpload = 0;
                for (var i in vm.uploader.queue) {
                    sizeToUpload +=vm.uploader.queue[i].file.size;
                }
                if(sizeToUpload>vm.allowedSize){
                    alert('上传文件超过了容量限制，上传文件大小 '+sizeToUpload+'，容量限制 ' + vm.allowedSize);
                    return;
                }
            }

            //执行上传动作，如果允许覆盖，直接上传
            if(vm.uploadOverwrite) {
                vm.uploader.uploadAll();
                return;
            }

            //否则不允许覆盖，则需要查询是否有重名文件，需要用户事先确定是否覆盖。
            vm.fileDuplicate = [];
            //构造查询条件
            //db.files.find({$or:[{name:'aa'},{name:'about_pic'}],fname:'20150713_091656431_file_aa.png'},{name:1,fname:1});
            var orFullNames = [];
            for(var i in vm.uploader.queue){
                orFullNames.push({fullname: vm.uploader.queue[i].file.name});
            }
            BaseService.page({path : vm.currentDir, isFile:true, $or:orFullNames},null,'fullname')
                .success(function (data) {
                    if(data && data.length>0) {
                        for(var i in data){
                            vm.fileDuplicate.push(data[i].fullname);
                        }
                        $("#modalDuplicate").modal();
                    }else
                        fileItem.upload();
                });
        };
        vm.upload = function(fileItem){
            //检查上传文件是否超出了容量限制
            if(Auth.user.code!='admin') {
                var sizeToUpload = fileItem._file.size;
                if (sizeToUpload > vm.allowedSize) {
                    alert('上传文件超过了容量限制，上传文件大小 ' + sizeToUpload + '，容量限制 ' + vm.allowedSize);
                    return;
                }
            }
            if(vm.uploadOverwrite) {
                fileItem.upload();
                return;
            }
            //查询是否存在同名的
            var name = fileItem.file.name;
            vm.fileDuplicate = [];
            BaseService.page({path : vm.currentDir, fullname: name
                , isFile:true},null, 'fullname')
                .success(function (data) {
                if(data && data.length>0) {
                    vm.fileDuplicate.push(data[0].fullname);
                    $("#modalDuplicate").modal();
                }else
                    fileItem.upload();
            });
        };

        /** 删除同名文件，准备下次无同名上传 */
        vm.deleteDuplicate = function(){
            if(!vm.fileDuplicate || vm.fileDuplicate.length<1)
                return;
            //扫描上传队列，通过名字来定位
            var n;
            for(var len=vm.uploader.queue.length, i=len-1; i>-1; i--){
                n = vm.uploader.queue[i].file.name;
                if(vm.fileDuplicate.indexOf(n)>-1){
                    vm.uploader.queue[i].remove();
                }
            }
            vm.fileDuplicate = [];
        };
        vm.uploader = uploader;
    }])

    //视频播放控制器
    //待解决：播放G级大小视频文件会导致chrome崩溃，其他浏览器暂无此问题
    .controller('videoController', ['$sce', '$location', 'ContextService', function($sce, $location, ContextService) {
        var vm        = this;
        vm.currentDir = ContextService.pop('files.currentDir');

        //如果没有设定当前目录，肯定不是从文件管理器转过来的，属于非法操作，转到文件管理器
        if(!vm.currentDir){
            $location.path('/files');
            return;
        }

        //配置播放源信息
        var showFile = ContextService.get('showFile');
        vm.config    = {
            sources: [
                {src: $sce.trustAsResourceUrl(showFile.rpath), type: "video/mp4"},
            ],
            theme: "public/bower/videogular-themes-default/videogular.css",
            plugins: {}
        };
    }])
;