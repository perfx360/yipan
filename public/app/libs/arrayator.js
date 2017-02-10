// 区别与Paginator，那里是从服务器按页获取数据，这里一次性加载数据
// 即没有分页栏，取名arrayator = array + [pagin]ator
angular.module('arrayService', ['baseService'])
    .factory('Arrayator', ['BaseService', function (BaseService) {
        // 先定义一个空对象
        var arrayator           = {};
        arrayator.dataHidden    = [];        //隐藏的元素集合
        arrayator.entity        = BaseService;     //对应的数据模型对象
        arrayator.showFilter    = true;        //是否显示模糊筛选框
        arrayator.keywords      = null;          //当前使用的筛选关键字
        arrayator.processing    = false;       //是否正在获取数据的标志，用于显示繁忙标志
        arrayator.deleteMessage = '';       //用于显示删除警告框时的提示信息
        arrayator.deleteId      = null;          //记录选择的ID，用于后来的删除操作

        //删除时提示确认框，输入的参数是被选中的数据对象
        arrayator.modalDelete = function(obj){
            if(!obj) return;

            //准备删除提示框显示的数据
            arrayator.deleteId      = obj._id;
            arrayator.deleteMessage = arrayator.entity.generateDeleteMessage(obj);
            $("#modalDelete").modal();
        };

        //删除记录
        arrayator.delete = function () {
            if(!arrayator.deleteId) return;
            arrayator.processing = true;

            //console.log('ready to call mongoose delete id =', id);
            arrayator.entity.delete(arrayator.deleteId).success(function (data) {
                if(data && data.success){
                    //删除成功后需要更新页面总数，并更新Paginator的设置
                    arrayator.deleteResult(arrayator.deleteId);
                }else{
                    alert('删除失败：' + JSON.stringify(data));
                }
                arrayator.processing = false;
            });
        };

        //根据关键字筛选，有三种情形
        //1. 清除筛选，显示全部结果，此时keyword=null
        //2. 执行筛选，可输入的关键字为空，或者trim后为空
        //3. 执行筛选，输入关键字有内容，执行筛选动作
        arrayator.filter = function(event){
            //回车出发跳转的动作
            if(!event || event.charCode == 13) {
                var criteria         = arrayator.generateFilterCriteria();
                var dataTemp         = arrayator.data;
                var hiddenTemp       = arrayator.dataHidden;
                arrayator.data       = [];
                arrayator.dataHidden = [];
                //分别筛选可见和不可见的两个数组
                for(var i in dataTemp){
                    if(arrayator.filterMatch(dataTemp[i], criteria)){
                        arrayator.data.push(dataTemp[i]);
                    }else
                        arrayator.dataHidden.push(dataTemp[i]);
                }
                for(var i in hiddenTemp){
                    //只要被隐藏过，选中的状态被取消
                    hiddenTemp[i].selected = false;
                    if(arrayator.filterMatch(hiddenTemp[i], criteria)){
                        arrayator.data.push(hiddenTemp[i]);
                    }else
                        arrayator.dataHidden.push(hiddenTemp[i]);
                }
                dataTemp   = null;
                hiddenTemp = null;
            }
        };

        /** 查看一个数据是否满足筛选条件 */
        arrayator.filterMatch = function(record, criteria){
            var field;
            for(var i in criteria){
                field = record[criteria[i].name];
                if(!field) return false; //无此属性，肯定不匹配
                switch (criteria[i].type) {
                    case 'text':
                    case 'select':
                        if(!field.match(criteria[i].value)) return false;
                        break;
                    case 'number': //数字和日期都是区间比较运算
                        if(criteria[i].value && field<criteria[i].value) return false;
                        if(criteria[i].value1 && field>criteria[i].value1) return false;
                        break;
                    case 'date': //数字和日期都是区间比较运算
                        var d = new Date(field);
                        if(criteria[i].value && d<criteria[i].value) return false;
                        if(criteria[i].value1 && d>criteria[i].value1) return false;
                        break;
                    default:
                        return false;
                }
            }
            return true;
        };

        //清除筛选结果，如果本来就没有筛选关键字或者给定的关键字为空，不做任何动作
        //否则清空筛选关键字，重新查询数据
        arrayator.clearFilter = function(column, value){
            if (!arrayator.customFilter[column][value]) return;
            arrayator.customFilter[column][value] = null;
            arrayator.filter();
        };

        /** 准备筛选的条件 {type:text,name:name,reg:/(aa).(bb)} */
        arrayator.generateFilterCriteria = function(){
            var criteria = [];
            for(var i in arrayator.customFilter){
                if(!arrayator.customFilter[i].show) continue;
                var c = {name:i,type:arrayator.customFilter[i].type};
                switch (c.type){
                    case 'text': //文本的查询是通过正则表达式，多个关键字表示逻辑与
                        //先将用户输入的字符串中的保留字符转义，确保不出现保留字符而产生歧义
                        var s = arrayator.customFilter[i].value;
                        if(!s){c=null; break;}
                        s = s.trim();
                        if(!s){c=null; break;}
                        s = s.replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
                        //把用户给定的关键字用.*连起来，表示只要出现了用户给定的关键字，并且顺序匹配就可以
                        s = s.split(/\s+/);
                        var reg = '';
                        var temp;
                        for (temp in s) {
                            if (s[temp])
                                reg += '.*(' + s[temp] + ')';
                        }
                        if (reg.length > 2)
                            reg = reg.substr(2);
                        c.value = reg;
                        break;
                    case 'number': //准备上下限的两个数字
                        if(arrayator.customFilter[i].value)
                            c.value = arrayator.customFilter[i].value;
                        if(arrayator.customFilter[i].value1)
                            c.value1 = arrayator.customFilter[i].value1;
                        if(!c.value && !c.value1){c=null;}
                        break;
                    case 'date':
                        if(arrayator.customFilter[i].value){
                            var date = arrayator.customFilter[i].value;
                            //加上时间参数
                            var time = arrayator.customFilter[i].value1;
                            if(time){
                                date.setHours(time.getHours());
                                date.setMinutes(time.getMinutes());
                                date.setSeconds(time.getSeconds());
                            }
                            c.value = date;
                        }
                        if(arrayator.customFilter[i].value2){
                            var date = arrayator.customFilter[i].value2;
                            //加上时间参数
                            var time = arrayator.customFilter[i].value3;
                            if(time){
                                date.setHours(time.getHours());
                                date.setMinutes(time.getMinutes());
                                date.setSeconds(time.getSeconds());
                            }else{
                                date.setHours(23);
                                date.setMinutes(59);
                                date.setSeconds(59);
                            }
                            c.value1 = date;
                        }
                        if(!c.value && !c.value1){c=null;}
                        break;
                    case 'select': //列表选择也是通过正则表达式
                        var arr = arrayator.customFilter[i].value;
                        if(!arr || arr.lengh<1){c=null; break;};
                        var reg = '';
                        for (var i in arr) {
                            reg += '|' + arr[i];
                        }
                        if (reg.length > 1)
                            reg = reg.substr(1);
                        c.value = '(' + reg + ')';
                        break;
                    default :
                        c = null;
                }
                if(c) criteria.push(c);
            }
            return criteria;
        };

        //通过点击自定义筛选按钮可以决定是否显示自定义筛选输入区域
        arrayator.showCustomFilter = function(column) {
            //show属性不断轮换。
            arrayator.customFilter[column].show = !arrayator.customFilter[column].show;

            //检测更新筛选结果的条件：仅在关闭筛选框，且有输入筛选值的条件下刷新
            if(!arrayator.customFilter[column].show){
                if(arrayator.customFilter[column].value || arrayator.customFilter[column].value1
                    || arrayator.customFilter[column].value2 || arrayator.customFilter[column].value3)
                    arrayator.filter();
            }
        };

        //由于所有的实体都共用这个分页对象，这里需要初始化组件
        arrayator.refresh = function(){
            arrayator.format = null;
        };

        //允许对查询后的结果进行格式化，这里是抽象类，不做任何事
        arrayator.format = function(data){
            return data;
        };

        //重新查询数据
        arrayator.retrieveData = function(cb){
            arrayator.processing = true;
            arrayator.errMessage = null;
            arrayator.entity.page(arrayator.criteria)
                .success(function (data) {
                    arrayator.dataHidden = [];
                    if(data.message)
                        arrayator.errMessage = data.message;
                    if(data.data && data.data.length>0) {
                        if(arrayator.format)
                            arrayator.data = arrayator.format(data.data);
                        else
                            arrayator.data = data.data;
                    }else
                        arrayator.data = [];
                    arrayator.processing = false;
                    if(cb) cb(null);
                });
        };

        //点击表头会按照某一列来排序，默认按name排序
        arrayator.sortCol = 'name';
        arrayator.sortDir = true;
        arrayator.sort = function(sortCol) {
            arrayator.sortCol = (arrayator.sortCol === sortCol) ? '-'+arrayator.sortCol : sortCol;
        };
        //模糊搜索条件，靠输入框实时输入
        arrayator.vagueFind = "";
        
        return arrayator;
    }]);

