// 用于分页的对象
angular.module('pageService', ['baseService'])
    .factory('Paginator', ['BaseService', function (BaseService) {
        //最大显示页数 maxShowPages:    可直接跳转的页码显示最大个数，也决定了是否显示前/后n条链接
        //每页的数据行数 pageSize:     每页可显示的最大行数，与数据集合的总行数可以计算出总页数
        var MaxShowPages = 3;
        var PageSize = 10;

        // 先定义一个空对象
        var paginator           = {};
        paginator.data          = null;              //加载的数据集合
        paginator.entity        = BaseService;     //对应的数据模型对象
        paginator.current       = 1;              //当前显示页面
        paginator.maxPages      = 0;             //最大可显示页面
        paginator.resultCount   = 0;          //可显示的记录条数
        paginator.needGotoPage  = false;     //是否需要显示跳转到第几页
        paginator.showFilter    = true;        //是否显示模糊筛选框
        paginator.keywords      = null;          //当前使用的筛选关键字
        paginator.criteria      = null;          //当前查询数据的条件
        paginator.givenPageGoto = null;     //用户输入的跳转到页面数
        paginator.pageSize      = PageSize;      //当前每页显示的行数，开始使用默认值
        paginator.givenPageSize = PageSize; //用户给定的当前页面显示的行数，开始使用默认值
        paginator.processing    = false;       //是否正在获取数据的标志，用于显示繁忙标志
        paginator.items         = null;             //页面导航数据
        paginator.deleteMessage = '';       //用于显示删除警告框时的提示信息
        paginator.deleteId      = null;          //记录选择的ID，用于后来的删除操作
        paginator.criteriaFixed = null;         //固定的筛选条件，无论用户执行什么动作都会携带这个条件

        //删除时提示确认框，输入的参数是被选中的数据对象
        paginator.modalDelete = function(obj){
            if(!obj) return;

            //准备删除提示框显示的数据
            paginator.deleteId      = obj._id;
            paginator.deleteMessage = paginator.entity.generateDeleteMessage(obj);

            $("#modalDelete").modal();
        };

        //清空所有记录
        paginator.clear = function () {
            paginator.processing = true;

            paginator.entity.clear().success(function (data) {
                if(data && data.success){
                    //清空成功重新刷新页面数据，注意这里不一定没有任何数据，例如日志就总是还有一条
                    //即清空动作的日志
                    paginator.current = 1;
                    paginator.refreshFilter();
                }else{
                    alert('删除失败：' + JSON.stringify(data));
                }
                paginator.processing = false;
            });
        };

        //删除记录
        paginator.delete = function () {
            if(!paginator.deleteId) return;
            paginator.processing = true;

            paginator.entity.delete(paginator.deleteId).success(function (data) {
                if(data && data.success){
                    //删除成功后需要更新页面总数，并更新Paginator的设置
                    paginator.deleteResult();
                    //重新刷新数据
                    paginator.page(paginator.current);
                }else{
                    alert('删除失败：' + JSON.stringify(data));
                }
                paginator.processing = false;
            });
        };

        //通过点击自定义筛选按钮可以决定是否显示自定义筛选输入区域
        paginator.showCustomFilter = function(column){
            //show属性不断轮换。
            paginator.customFilter[column].show = !paginator.customFilter[column].show;
            //只要有一个列筛选是显示的，模糊筛选框就隐藏
            var showFilter = true;
            for(var i in paginator.customFilter){
                if(paginator.customFilter[i].show){
                    showFilter = false;
                    break;
                }
            }
            //模糊筛选框从隐藏变到显示时，重新刷新数据
            if(showFilter && !paginator.showFilter){
                paginator.refreshFilter();
            }
            paginator.showFilter = showFilter;

        };

        //根据关键字筛选，有三种情形
        //1. 清除筛选，显示全部结果，此时keyword=null
        //2. 执行筛选，可输入的关键字为空，或者trim后为空
        //3. 执行筛选，输入关键字有内容，执行筛选动作
        paginator.filter = function(event){
            //回车出发跳转的动作
            if(!event || event.charCode == 13) {
                paginator.refreshFilter();
            }
        };

        //清除筛选结果，如果本来就没有筛选关键字或者给定的关键字为空，不做任何动作
        //否则清空筛选关键字，重新查询数据
        paginator.clearFilter = function(column, value){
            if(!column) {//主要筛选字段
                if (!paginator.keywords) return;
                //清除筛选框中的文字
                paginator.keywords = null;
            }else{//自定义筛选字段
                if (!paginator.customFilter[column][value])
                    return;
                paginator.customFilter[column][value] = null;
            }
            paginator.refreshFilter();
        };

        //更新筛选的结果，需要重新确定记录的条数，并同时更新paginator的信息
        paginator.refreshFilter = function(){
            paginator.message    = null;
            paginator.processing = true;
            //准备查询条件
            paginator.criteria   = paginator.generateFilterCriteria();

            //先查询总记录条数
            paginator.entity.count({criteria:paginator.criteria}).success(function (data){
                if(data) {
                    if (data.count){
                        paginator.init(data.count);
                        //重新查询数据
                        paginator.retrieveData();
                    }else{
                        paginator.resultCount = 0;
                        paginator.init(0);
                        //设置数据集合为空
                        paginator.data = {};
                        if(data.message){
                            paginator.message = data.message;
                        }
                    }
                }
                paginator.processing = false;
            });
        };

        //删除一条记录，需要将resultCount减一，并且更新总页数和记录集合
        paginator.deleteResult = function(){
            paginator.resultCount --;
            //最后一条记录删除，全部清空
            if(paginator.resultCount<=0) {
                paginator.items    = [];
                paginator.current  = 1;
                paginator.maxPages = 0;
                return;
            }

            //因为删除记录导致总页数减少，
            var mPages = Math.ceil(paginator.resultCount / paginator.pageSize);
            if(mPages<paginator.maxPages){
                var c = paginator.current;

                //重新初始化Paginator对象
                paginator.init(paginator.resultCount);

                //设定当前页，尽量保持不变，只有当最后一页被删除后，才往前移一页
                if(c<=mPages){
                    paginator.current = c;
                }else{
                    paginator.current = mPages;
                }

                paginator.update();
            }
        };

        //执行筛选，如果给定的关键字为空，则表示清除筛选结果
        //返回是否修改了当前的筛选关键字信息
        //即结果是否需要更新
        paginator.setFilter = function(keyword){
            //console.log('setFileter with keyword = ', keyword);
            if(keyword==null){
                if(paginator.keywords!=null){
                    //清除结果
                    paginator.keywords = null;
                    return true;
                }
            }else{
                if(paginator.keywords!=keyword){
                    //执行筛选
                    paginator.keywords = keyword;
                    return true;
                }
            }
            return false;
        };

        //用户选择跳转到某一个特定的页面
        paginator.goto = function(event){
            //回车出发跳转的动作
            if(event.charCode == 13) {
                if(paginator.givenPageGoto && paginator.givenPageGoto.match(/^\d.*$/)){
                    var pageIndex = parseInt(paginator.givenPageGoto);
                    if(pageIndex && pageIndex!=paginator.current){
                        paginator.page(pageIndex);
                    }
                }
            }
        };

        //用户设定每页显示的行数
        paginator.setPageSize = function(event){
            //回车出发跳转的动作
            if(event.charCode == 13) {
                if(paginator.givenPageSize && paginator.givenPageSize.match(/^\d.*$/)){
                    var pageSize = parseInt(paginator.givenPageSize);
                    if(pageSize && pageSize!=paginator.pageSize){
                        paginator.processing = true;
                        paginator.pageSize   = pageSize;
                        paginator.init();

                        //重新查询数据
                        paginator.retrieveData();
                    }
                }
            }
        };

        //跳转页面的操作
        paginator.page = function(pageIndex){
            paginator.processing = true;

            //确定跳转后的当前页是多少
            paginator.updatePage(pageIndex);

            //清空跳转页面文本框数据
            paginator.givenPageGoto = null;

            //重新查询数据
            paginator.retrieveData();
        };

        //重新查询数据
        paginator.retrieveData = function(){
            paginator.entity.page(paginator.criteria, paginator.getConfig())
                .success(function (data) {
                    if(data && data.length>0) {
                        if(paginator.format)
                            paginator.data = paginator.format(data);
                        else
                            paginator.data = data;
                    }else
                        paginator.data = null;
                    paginator.processing = false;
                });
        };

        //点击表头会按照某一列来排序
        paginator.sort = function(colName){
            paginator.processing = true;

            //更新排序信息
            paginator.updateSort(colName);

            //重新查询数据
            paginator.retrieveData();
        };

        /**
         * 根据筛选字段准备Mongoose需要的正则查询参数
         * 需要考虑主要筛选字段（针对所有字段信息的筛选）和各列自定义的筛选选项
         * 分为两种：
         *      模糊查询，直接使用keywords来构建
         *      列查询，扫描所有定义了筛选条件的列，按列组合查询条件
         */
        paginator.generateFilterCriteria = function(){
            var criteriaAll;
            if(paginator.showFilter) { //TODO 是否也支持关联表的模糊查询？目前模糊的筛选仅仅支持字符串字段
                //如果输入的筛选关键字没有或者没有实质内容，则等同于清除筛选结果
                if(paginator.keywords){
                    paginator.keywords = paginator.keywords.trim();
                    var reg = paginator.generateKeyReg(paginator.keywords);
                    var regPinyin = paginator.generatePinyinReg(paginator.keywords);

                    criteriaAll = paginator.entity.generateFilterCriteria(reg, regPinyin);
                }
            }else{
                //列查询，根据列的属性来决定用哪种查询方式
                //text  模糊匹配
                //select 精确匹配
                //date/number 区间匹配
                var criteria = {};
                var value;
                for(var i in paginator.customFilter){
                    if(paginator.customFilter[i].show){
                        //只考虑显示的筛选条件
                        switch(paginator.customFilter[i].type){
                            //关联字段筛选，需要构建匹配的ids集合
                            case 'related':
                                value = paginator.customFilter[i].ids;
                                if(value){
                                    if(value.length === 0){
                                        //关联字段配有匹配的，筛选结果必定为空
                                        //return 'none';
                                    }else {
                                        var ic = {};
                                        ic['$in'] = value;
                                        criteria[i] = ic;
                                    }
                                }
                                break;

                            case 'text': //模糊匹配，用正则表达式
                                value = paginator.customFilter[i].value;
                                if(value) {
                                    value = value.trim();
                                    value = value.replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
                                    //处理拼音首字母搜索
                                    if(paginator.entity.pinyinSort && paginator.entity.pinyinSort.indexOf(i)>-1){
                                        var ors = [];
                                        var tempO = {};
                                        tempO[i] = {$regex: '(' + value + ')'};
                                        ors.push(tempO);
                                        var tempP = {};
                                        tempP['_p_'+i] = {$regex: paginator.generatePinyinReg(value)};
                                        ors.push(tempP);
                                        criteria['$or'] = ors;
                                    }else //无拼音，直接匹配
                                        criteria[i] = {$regex: '(' + value + ')'};
                                }
                                break;
                            case 'select': //列表框采用多重选择，允许用户选择多个选项，选项之间是逻辑或的关系
                                value = paginator.customFilter[i].value;
                                if(value && value.length>0){
                                    var ic2 = {};
                                    ic2['$in'] = value;
                                    criteria[i] = ic2;
                                }
                                break;
                            case 'date':
                                //日期筛选可以精确至年月日时分，由于分为日期和时间选择器，共可能有4个参数
                                // value, value1 对应起止日期和时间
                                // value2, value3 对应起止日期和时间
                                var lgte = {};
                                var isEmpty = true;
                                value = paginator.customFilter[i].value;
                                if(value){
                                    var dt = value.getFullYear() + '-' + (value.getMonth()+1) + '-' + value.getDate();
                                    //加上时间参数
                                    value = paginator.customFilter[i].value1;
                                    if(value){
                                        dt += ' ' + value.getHours() + ':' + value.getMinutes() + ':' + value.getSeconds();
                                    }else{
                                        //默认加上这一天的起始时间
                                        dt += ' 0:0:0';
                                    }

                                    lgte['$gte'] = new Date(dt);
                                    isEmpty = false;
                                }
                                value = paginator.customFilter[i].value2;
                                if(value) {
                                    var dt2 = value.getFullYear() + '-' + (value.getMonth()+1) + '-' + value.getDate();
                                    //加上时间参数
                                    value = paginator.customFilter[i].value3;
                                    if (value) {
                                        dt2 += ' ' + value.getHours() + ':' + value.getMinutes() + ':' + value.getSeconds();
                                    }else{
                                        //默认加上这一天的结束时间
                                        dt2 += ' 23:59:59';
                                    }
                                    lgte['$lte'] = new Date(dt2);
                                    isEmpty = false;
                                }
                                if(!isEmpty)
                                    criteria[i] = lgte;
                                break;
                            case 'number':
                                var lgte2 = {};
                                var num;
                                value = paginator.customFilter[i].value;
                                if(value){
                                    num = parseFloat(value);
                                    if(!isNaN(num)){
                                        lgte2['$gte'] = num;
                                    }
                                }
                                value = paginator.customFilter[i].value2;
                                if(value){
                                    num = parseFloat(value);
                                    if(!isNaN(num)){
                                        lgte2['$lte'] = num;
                                    }
                                }
                                if(lgte2)
                                    criteria[i] = lgte2;
                                break;
                        }
                    }
                }
                criteriaAll = criteria;
            }

            //加上一次性的筛选条件，一般是定制查找
            //if(paginator.templateFilter) {
            //    if(!criteriaAll) criteriaAll = {};
            //    //遍历额外筛选条件，添加到筛选条件中
            //    for ( var p in paginator.templateFilter ) {
            //        if (typeof ( paginator.templateFilter [ p ]) != " function " ){
            //            if(criteriaAll[p]){//存在的属性，合并属性
            //                criteriaAll[p] = paginator.mergeCriteria(criteriaAll[p], paginator.templateFilter[p]);
            //            }else{//不存在，直接增加
            //                criteriaAll[p] = paginator.templateFilter[p];
            //            }
            //        }
            //    }
            //    //由于是一次性的，用完后删除
            //    paginator.templateFilter = null;
            //}

            //加上额外定义的筛选条件，一般是直接选择的结果
            if(paginator.extraFilter) {
                if(!criteriaAll) criteriaAll = {};
                //遍历额外筛选条件，添加到筛选条件中
                for ( var p in paginator.extraFilter ) {
                    if (typeof ( paginator.extraFilter [ p ]) != " function " ){
                        if(criteriaAll[p]){//存在的属性，合并属性
                            criteriaAll[p] = paginator.mergeCriteria(criteriaAll[p], paginator.extraFilter[p]);
                        }else{//不存在，直接增加
                            criteriaAll[p] = paginator.extraFilter[p];
                        }
                    }

                }
            }

            return criteriaAll;
        };

        /**
         * 为了对字符串字段进行关键字查找构造正则表达式
         * @param keywords
         * @returns {string}
         */
        paginator.generateKeyReg = function(keywords){
            if(!keywords) return null;
            //先将用户输入的字符串中的保留字符转义，确保不出现保留字符而产生歧义
            var k = keywords.replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
            return '(' + k + ')';
            //var s = keywords.replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
            ////把用户给定的关键字用.*连起来，表示只要出现了用户给定的关键字，并且顺序匹配就可以
            //s = s.split('');
            ////s = s.split(/\s+/);
            //var reg = '';
            //var temp;
            //for (temp in s) {
            //    if (s[temp])
            //        reg += '.*(' + s[temp] + ')';
            //}
            //if (reg.length > 2)
            //    reg = reg.substr(2);
            //return reg;
        };

        /** 按照全拼音的首字母匹配
         * 由给定的查询关键字构建查询首字母拼音的正则表达式
         * 例如 key = 'gzxt',需要构建的正则表达式是：
         *       \bg.*\bz.*\bx.*\bt
         * @param keywords
         * @returns {*}
         * */
        paginator.generatePinyinReg = function(keywords){
           if(!keywords) return null;
            var reg = '';
            for(var i= 0,len= keywords.length; i<len; i++){
                reg += '.*\\b' + keywords.charAt(i);
            }
            return reg.substr(2);
        };

        //页面元素直接给定的筛选条件
        paginator.extraFilter = null;

        /** 合并两个筛选条件，目前只有一种可能就是如{type:{$in:['id1','id2']}}
         * 例如：{type:{$in:['id1','id2']}} 与 {type:{$in:['id2','id3','id4']}}
         * 其合并后的条件应为 {type:{$in:['id2']}}，即为逻辑与运算
         * @param c1
         * @param c2
         */
        paginator.mergeCriteria = function(c1, c2){
            var array1 = c1['$in'];
            var neuArray = [];
            //遍历第一个数组
            for(var a in array1){
                //如果第二个数组不包含的元素，则需要删除
                if(c2['$in'].indexOf(array1[a])>-1){
                    neuArray.push(array1[a]);
                }
            }
            return {'$in':neuArray};
        };

        //重置对象的属性
        paginator.reset = function(){
            paginator.format = null;
            paginator.showFilter = true;
            paginator.extraFilter = null;
        };

        // 初始化的功能，根据给定的最大记录条数，以及每页条数和最大显示页数来决定
        // 页面导航条的外观
        paginator.init = function (resultCount) {
            paginator.items        = [];
            paginator.needGotoPage = false;
            if(!resultCount)//改变每页显示行数时，不需要重新查询记录的个数
                resultCount = paginator.resultCount;
            else
                paginator.resultCount = resultCount;

            if(resultCount<=0) {
                return;
            }

            //计算总页数，等于总记录数除以每页记录数，遇到小数则向上取整数
            paginator.maxPages = Math.ceil(resultCount / paginator.pageSize);

            //准备页码导航的数据
            //如果小于最大显示页数，则直接显示所有页码
            //否则需要显示前后一页，及前后10页的链接，还有调到指定页的文本框
            //每个页面导航的元素含有以下几项数据：
            //          label，pageIndex，class
            // 表示：    标签文本，对应的页码，显示的CSS class
            //默认当前页是第一页
            paginator.current = 1;
            if(paginator.maxPages>MaxShowPages){
                paginator.needGotoPage = true;
                paginator.items.push({label:'<<', pageIndex:-1, tooltip:'第一页'});
                //paginator.items.push({label:'.<', pageIndex:-2, tooltip:'上'+MaxShowPages+'页'});
                paginator.items.push({label:'<', pageIndex:-3, tooltip:'上一页'});

                paginator.items.push({label:''+paginator.current, pageIndex:paginator.current, class:'active'});
                var i=2;
                //for(;i<=MaxShowPages/2;i++){
                //    paginator.items.push({label:''+i, pageIndex:i});
                //}
                //paginator.items.push({label:'GOTO', pageIndex:0});
                for(;i<=MaxShowPages;i++){
                    paginator.items.push({label:''+i, pageIndex:i});
                }

                paginator.items.push({label:'>', pageIndex:-7, tooltip:'下一页'});
                //paginator.items.push({label:'>.', pageIndex:-8, tooltip:'下'+MaxShowPages+'页'});
                paginator.items.push({label:'>>', pageIndex:-9, tooltip:'最后一页'});
            }else if(paginator.maxPages>1){
                paginator.items.push({label:''+paginator.current, pageIndex:paginator.current, class:'active'});
                for(var i=2;i<=paginator.maxPages;i++){
                    paginator.items.push({label:''+i, pageIndex:i});
                }

            }
        };

        //更新页面导航数据，主要有两项内容
        // 1. 更新当前页的class属性，便于显示当前页面
        // 2. 更新直接跳转页面的数据，以共13页显示4页为例
        //        current 		显示页面
        //        1，2，3，4		1，2，3，4
        //        5，6，7，8		5，6，7，8
        //        9，10，11，12		9，10，11，12
        //        13			10，11，12，13
        //规律是：只要当前页不是最后一页，则显示当前页所在的页面轮次，否则则显示倒推的最后maxPages页。
        //改进的策略是如果当前页面已经显示，则不更新页面数据，只更新class属性，否则再按前面的策略更新页面数据
        paginator.update = function(){
            if(!paginator.items || paginator.items.length==0) return;

            var found = false;
            //首先确定当前页面是否已经在页面导航中
            for(var index in paginator.items){
                if(paginator.items[index].pageIndex == paginator.current){
                    //如果有，则设置其class属性，并记录标志
                    paginator.items[index].class = 'active';
                    found = true;
                }else{
                    //否则，先取消其class属性
                    delete paginator.items[index].class;
                }
            }

            //console.log('exec Paginator.update with paginator = ', paginator
            //, ', found = ', found);

            //没有找到，则需要重新加载页码数据
            if(!found){
                //先确定当前是第几轮
                var currentPageGroup = Math.ceil(paginator.current / MaxShowPages);
                var maxPageGroup = Math.ceil(paginator.maxPages / MaxShowPages);

                //console.log('currentPageGroup = ', currentPageGroup, ', maxPageGroup = ', maxPageGroup);
                //不是最后一页，直接加载这一轮的页码
                //这里仅确定这一轮页码的第一个
                var begin = paginator.current;
                if(currentPageGroup<maxPageGroup){
                    begin = MaxShowPages * (currentPageGroup-1) + 1;
                }else{
                    //否则加载从后数起的第一轮，保证总是显示maxshowPages个页面
                    begin = paginator.maxPages - MaxShowPages + 1;
                }

                var index;
                for(var i=begin;i<(begin+MaxShowPages);i++){
                    //确定对应的页面导航元素的索引，直接页面是从第三个元素开始
                    index = i-begin+2;

                    paginator.items[index].label     =''+i;
                    paginator.items[index].pageIndex =i;
                    if(i==paginator.current)
                        paginator.items[index].class='active';
                    else{
                        delete paginator.items[index].class;
                    }
                }
            }
        };

        // 根据当前显示页面和用户的选择来决定下一个当前页面
        paginator.updatePage = function (pageIndex) {
            //如果用户选择的是页面的页码，直接设定为当前页，并调整相应的页面导航数据
            if(pageIndex>0) {
                if(pageIndex>paginator.maxPages) {
                    if(paginator.maxPages>0)
                        paginator.current = paginator.maxPages;
                }else
                    paginator.current = pageIndex;
            }else{
                //否则则肯定是前后页的选择
                switch(pageIndex)
                {
                    case -1:
                        //第一页
                        paginator.current = 1;
                        break;
                    case -2:
                        //前翻指定的页码数
                        if(paginator.current>MaxShowPages) {
                            paginator.current = paginator.current - MaxShowPages;
                        }
                        break;
                    case -3:
                        //前一页
                        if(paginator.current>1) {
                            paginator.current = paginator.current - 1;
                        }
                        break;
                    case -9:
                        //最后一页
                        paginator.current = paginator.maxPages;
                        break;
                    case -8:
                        //后翻指定的页码数
                        if((paginator.current+MaxShowPages)<=paginator.maxPages) {
                            paginator.current = paginator.current + MaxShowPages;
                        }
                        break;
                    case -7:
                        //后一页
                        if(paginator.current<paginator.maxPages) {
                            paginator.current = paginator.current + 1;
                        }
                        break;
                }
            }
            paginator.update();
        };

        //为查询数据准备查询条件
        // currentPage, PageSize, sortColumn, sortDir
        paginator.getConfig = function () {
            return {
                  currentPage   :paginator.current
                , pageSize      :paginator.pageSize
                , sortColumn    :paginator.sortColumn
                , sortDir       :paginator.sortDir
            };
        };

        //排序方面的参数设定
        paginator.sortDir = 1; //默认升序排列
        paginator.setSortColumn = function(columnName){
            paginator.sortColumn = columnName;
            paginator.sortDir    = 1;
        };
        paginator.updateSort = function(columnName){
            //排序字段没变，只能是方向改变
            if(columnName==paginator.sortColumn){
                paginator.sortDir = paginator.sortDir * -1;
            }else{
                //新排序字段，默认升序排列
                paginator.sortColumn = columnName;
                paginator.sortDir = 1;
            }
        };
        return paginator;
    }]);