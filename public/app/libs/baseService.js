angular.module('baseService', [])
    //基础类，定义了数据表服务的基本结构
    .factory('BaseService', ['$http', function ($http) {
        var factory = {};

        /** 删除目录的请求 */
        factory.deleteFolder = function(id, path, rdelete){
            return $http.patch('/api/folder/', {id:id, path:path, rdelete:rdelete});
        };

        /** 目录改名的请求 */
        factory.renameFolder = function(path,oldName,newName){
            return $http.put('/api/folder/',{path:path, oldName:oldName, newName:newName});
        };

        /** 这是专门为文件粘贴编写的函数 */
        factory.paste = function(_id, config){
            return $http.patch(factory.apiPath + _id, config);
        };

        factory.get = function (id) {
            return $http.get(factory.apiPath + id);
        };

        factory.all = function () {
            return $http.get(factory.apiPath);
        };

        //增加拼音排序的字段，查看给定的查询条件里面是否有对中文字段的排序要求
        //如果有，则插入对应的拼音字段排序
        //  如原有的排序条件是：
        factory.addPinyinSort = function(criteria){
            //console.log("entering addPinyinSort with criteria = ", criteria);
            if(!factory.pinyinSort || factory.pinyinSort.length == 0)
                return criteria;

            //如果排序字段是拼音排序，将对应的拼音字段加在前面
            //如：{sortColumn:'code'} => {sortColumn:['_p_code','code']}
            if(criteria.sortColumn){
                if((typeof(criteria.sortColumn))=='string'){
                    //字符串
                    if(factory.pinyinSort.indexOf(criteria.sortColumn)>-1){
                        criteria.sortColumn = ['_p_' + criteria.sortColumn, criteria.sortColumn];
                    }
                }else{
                    //肯定已经是数组，重后往前插入拼音字段
                    for(var i=criteria.sortColumn.length-1; i>=0; i--){
                        if(factory.pinyinSort.indexOf(criteria.sortColumn[i])>-1){
                            criteria.sortColumn.splice(i,0,'_p_' + criteria.sortColumn[i]);
                        }
                    }
                }
            }
            return criteria;
        };

        // 按页查询数据，需要给定的参数有：currentPage，numPerPage
        factory.page = function (criteria, paginator, columns) {
            if(paginator) {
                paginator = factory.addPinyinSort(paginator);
                paginator = factory.formatCriteriaSort(paginator);
            }else
                paginator = {};
            if(criteria)
                paginator['criteriaFilter'] = criteria;
            if(columns)
                paginator['selectColumns'] = columns;
            return $http.put(factory.apiPath, paginator);
        };

        // 按指定条件返回所有匹配的数据，一般用户嵌套在其他视图中的搜索功能
        factory.find = function(criteria){
            var paginator = {};
            if(criteria)
                paginator['criteriaFilter'] = criteria;
            return $http.put(factory.apiPath, paginator);
        };

        //为了尽量减轻服务器的负担，这里将服务器需要的排序条件组织好，服务器可以直接进行查找
        //输入的参数结构是{...,sortColumn:[_p_code,code],sortDir:1}
        //输出的参数结构应该是
        // {...,criteriaSort:{_p_code:1,code:1}}
        factory.formatCriteriaSort = function(paginator){
            if(paginator.sortColumn){
                var dir = 1;
                if(paginator.sortDir)
                    dir = paginator.sortDir;

                paginator.criteriaSort = {};
                if((typeof(paginator.sortColumn))=='string'){
                    paginator.criteriaSort[paginator.sortColumn] = dir;
                }else{
                    //肯定已经是数组，重后往前插入拼音字段
                    for(var i= 0,len = paginator.sortColumn.length; i<len; i++){
                        paginator.criteriaSort[paginator.sortColumn[i]] = dir;
                    }
                }

                //删除不需要的字段
                delete paginator.sortColumn;
                delete paginator.sortDir;
            }
            return paginator;
        };

        factory.count = function (criteria) {
            if(!criteria){
                criteria = {};
            }
            return $http.patch(factory.apiPath, criteria);
        };

        factory.create = function (data) {
            return $http.post(factory.apiPath, data);
        };

        factory.update = function (data) {
            return $http.put(factory.apiPath + data._id, data);
        };

        factory.delete = function (id) {
            return $http.delete(factory.apiPath + id);
        };

        factory.clear = function () {
            return $http.delete(factory.apiPath);
        };

        // 这里有几个动作，需要串行化
        // 先从Token中获得当前用户的id信息，再查询当前用户的完整信息
        factory.getMe = function (Auth,cb) {
            var promise = Auth.getUser();
            promise.then(function(user)
                {
                    cb($http.get('/api/users/' + user.data._id));
                },function(err){
                    console.log(err);
                    return;
                }
            );
        };

        //根据筛选关键字添加查询范围，参数是一个数组，如用户筛选“黄埔 广州”
        //意味着需要任意一个字段内容既包含“黄埔”又包含“广州”，所以传入的
        //参数格式是'(黄埔).*(广州)'，根据每个数据表的字段多少需要构造
        //查询参数，如Supplier含有code,name,remark;它的查询参数是
        //{'$or' : [
        //              {name: {$regex:'(黄埔).*(广州)'}}
        //              {code: {$regex:'(黄埔).*(广州)'}}
        //              {remark: {$regex:'(黄埔).*(广州)'}}
        //          ]}
        factory.generateFilterCriteria = function(reg){
            var criteria = {};
            if(reg) {
                //模糊查询
                var or = [];
                //一般筛选都是对所有字段中进行匹配
                for (var f in factory.fields) {
                    var o = {};
                    o[factory.fields[f]] = {$regex: reg};
                    or.push(o);
                }
                //筛选条件是或者or
                criteria = {'$or': or};
            }
            return criteria;
        };

        /**
         * 删除一个对象时，需要用户确认，这里根据将被删除的对象生成一个
         * 提醒用户的字符串
         * @param obj
         */
        factory.generateDeleteMessage = function(obj){
            var msg = '';
            var p;
            for(var i in factory.fields){
                p = obj[factory.fields[i]];
                if(p){
                    msg += ', ' + factory.labels[i] + ' = ' + p;
                }
            }
            if(msg)
                return msg.substr(1);
            return null;
        };

        /**
         * 由于服务是静态的对象，所有数据表的操作都是共用一个BaseService
         * 这里通过初始化函数来实现各种数据表的定制
         */
        factory.setEntity = function(entityName){
            factory.apiPath = '/api/' + entityName + '/';
            switch(entityName) {
                case('questions')://设定api的url地址
                    //设定包含的字段，主要是用于生成筛选条件等使用
                    factory.fields = ['desc', 'type','remark'];
                    //设定各个字段对应的标签，用于显示用户可读的字符串
                    factory.labels = ['题干', '类型', '备注'];
                    factory.pinyinSort = null;
                    break;
                case('signgroups')://设定api的url地址
                    //设定包含的字段，主要是用于生成筛选条件等使用
                    factory.fields = ['name', 'pattern','remark'];
                    //设定各个字段对应的标签，用于显示用户可读的字符串
                    factory.labels = ['名称', '模式', '备注'];
                    factory.pinyinSort = null;
                    break;
                case('signs')://设定api的url地址
                case('examconfigs')://设定api的url地址
                case('sheets')://设定api的url地址
                case('qcategorys')://设定api的url地址
                    //设定包含的字段，主要是用于生成筛选条件等使用
                    factory.fields = ['name','remark'];
                    //设定各个字段对应的标签，用于显示用户可读的字符串
                    factory.labels = ['名称', '备注'];
                    factory.pinyinSort = null;
                    break;
                case('files')://设定api的url地址
                    //设定包含的字段，主要是用于生成筛选条件等使用
                    factory.fields = ['name', 'mimetype','size'];
                    //设定各个字段对应的标签，用于显示用户可读的字符串
                    factory.labels = ['名称', '类型', '文件大小'];
                    break;
                case('roles'):
                    //设定包含的字段，主要是用于生成筛选条件等使用
                    factory.fields = ['name','code','remark'];
                    //设定各个字段对应的标签，用于显示用户可读的字符串
                    factory.labels = ['名称','代号','备注'];
                    //申明哪些字段可以使用中文排序
                    factory.pinyinSort = ['name','remark'];
                    break;
                case('users'):
                    //设定包含的字段，主要是用于生成筛选条件等使用
                    factory.fields = ['name','code','remark'];
                    //设定各个字段对应的标签，用于显示用户可读的字符串
                    factory.labels = ['名称','代号','备注'];
                    //申明哪些字段可以使用中文排序
                    factory.pinyinSort = ['name','remark'];
                    break;
                case('logs'):
                    //设定包含的字段，主要是用于生成筛选条件等使用
                    factory.fields = ['user', 'path', 'method', 'date', 'parameters', 'url'];
                    //设定各个字段对应的标签，用于显示用户可读的字符串
                    factory.labels = ['用户','栏目','动作','日期','参数','地址'];
                    //申明哪些字段可以使用中文排序
                    factory.pinyinSort = null;
                    break;
                default:
                    factory.fields = [];
                    factory.labels = [];
                    factory.pinyinSort = null;
                    break;
            }
        };

        /**
         * 为了统一制定服务器返回的消息的函数
         * @param data  服务器的返回数据
         * @returns {*}
         */
        factory.formatMessage = function(data){
            if(data.errors) {
                var message = '服务器报告错误: ' + data.message;
                message += '。 错误原因: ' + JSON.stringify(data.errors);
                return message;
            }else if(data.err){
                var message = '数据库报告错误: [' + data.name + ',' + data.code + ']';
                message += '。 错误原因: ' + data.err;
                return message;
            }else if(data.message)
                return data.message;
            return JSON.stringify(data);
        };

        return factory;
    }]);