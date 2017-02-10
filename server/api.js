var mongoose     = require('mongoose');
var User         = require('./models/user');
var SignGroup    = require('./models/signgroup');
var QCategory    = require('./models/qcategory');
var Question     = require('./models/question');
var Exam         = require('./models/exam');
var System       = require('./models/system');
var ExamConfig  = require('./models/examconfig');
var Sheet        = require('./models/sheet');
var Check        = require('./models/check');
var Sign         = require('./models/sign');
var Role         = require('./models/role');
var Log          = require('./models/log');
var File         = require('./models/file');
var ServerLogger = require('./libs/serverLogger');
var jwt          = require('jsonwebtoken');
var config       = require('../config');
var Const        = require('./libs/Const');
var pCode        = require('./libs/pCode');
var multer       = require('multer');
var superSecret  = config.secret;
var fs           = require('fs');
var utils        = require('./libs/utils');
var async        = require('async');

/**
 * 通过当前应用和Express对象创建一个路由对象返回
 */
module.exports = function (app, express) {
    //需要返回的路由对象，初始化为Express的基本路由对象
    var apiRouter = express.Router();

    //////////authenticate//////////////////////////////
    apiRouter.post('/authenticate', function (req, res) {
        ////测试读取客户端IP
        //console.log('IP = ', utils.getClientIP(req));

        //console.log('req = ', req.body);
        if (!req.body.code) {
            res.json({message: Const.Msg.NoCode});
        } else if (!req.body.pwd) {
            res.json({message: Const.Msg.User.NoPWD});
        } else {
            //console.log('to locate user with code =', req.body.code);
            // 利用mongoose查找指定username的对象，返回的对象保存到user里
            User.findOne({
                code: req.body.code
            }).select('_id code name pwd role').populate('role').exec(function (err, user) {
                if (err) throw err;
                //console.log('get user = ', JSON.stringify(user));
                // no user with that username was found
                if (!user) {
                    res.json({message: Const.Msg.CodeNotExist});
                } else if (user) {
                    //console.log('found user : ', user);
                    //console.log('found user with _id : ', user._id);
                    // 密码检查，这里使用User模型的比较密码方法
                    var isValidPassword;
                    try {

                        isValidPassword = user.comparePassword(req.body.pwd);
                    }catch (e){
                        res.json({message: 'Bcypt验证错误：' + e.name + ' ' + e.message});
                    }
                    if (!isValidPassword) {
                        res.json({message: Const.Msg.User.PwdWrong});
                    } else {
                        var permits = null;
                        //var path = null;
                        if(user.role){
                            for (var i in user.role) {
                                permits = pCode.mergePermit(permits, user.role[i].permits);
                                //path = pCode.mergePath(path, user.role[i].paths);
                            }
                        }

                        //user.permits = '0000';
                        user.permits = permits;
                        //console.log('user = ', JSON.stringify(user));
                        //console.log('permits = ', permits);

                        // 利用[当前用户信息 + 公钥 + 连接参数]来生成连接标记
                        var userInfo = {
                            _id : user._id,
                            code: user.code,
                            name: user.name,
                            permits: user.permits
                        };
                        //console.log('userInfo =', userInfo);
                        var token = jwt.sign(userInfo, superSecret, {
                            expiresInMinutes: 180
                        });

                        // 返回成功信息，并附加新生成的连接标记，以方便以后的连接
                        var userData     = {};
                        userData.permits = user.permits;
                        userData._id     = user._id;
                        userData.code    = user.code;
                        userData.name    = user.name;
                        res.json({
                            success: true,
                            message: Const.Msg.User.LoginOK,
                            user   : userData,
                            token  : token
                        });
                    }
                }
            });
        }
    });

    // 测试路径，确保不登陆的条件下也能显示网页
    apiRouter.get('/', function (req, res) {
        res.json({message: Const.Msg.Welcome});
    });

    //// 中间层来为所有其他请求添加动作，这里主要是判别是否已经登录，即是否有token标记
    apiRouter.use(function (req, res, next) {
        // 获取标记，可以通过 URL（Get方式），param（post方式）或者 header方式共三种来设置token
        var token = req.body.token || req.params.token || req.headers['x-access-token'];
        if (token) {
            //console.log('token =',token);
            // 有标记，进行校验
            jwt.verify(token, superSecret, function (err, decoded) {
                if (err) {
                    console.log(err);
                    res.status(403).send({
                        success: false,
                        message: Const.Msg.Token.Invalid
                    });
                } else {
                    // 解码后的信息存放在请求中，名称为decoded
                    //console.log('decoded = ', decoded);
                    req.decoded = decoded;

                    //权限认证
                    //可以通过 req.method 和 req.path来判断请求的方法和相对路径
                    //console.log('Method: ', req.method);
                    //console.log('Path: ', req.path);
                    //console.log('Decoded: ', decoded);
                    // 继续处理请求
                    next();
                }
            });
        } else {
            console.log('no token');
            res.status(403).send({
                success: false,
                message: Const.Msg.Token.NONE
            });
        }
    });

    //先处理上传文件的请求
    apiRouter.use(multer({
        dest: config.uploadDir
        ,onFileUploadComplete: function (file, req, res) {
            /** 从文件和请求信息中获取file信息，保存到数据库
             * completing  { fieldname: 'file',
                  originalname: 'about_pic.jpg',
                  name: 'fileabout_pic_2015-7-9_21-17-45.jpg',
                  encoding: '7bit',
                  mimetype: 'image/jpeg',
                  path: 'd:\\Mean-workspace\\uploads\\fileabout_pic_2015-7-9_21-17-45.jpg',
                  extension: 'jpg',
                  size: 60053,
                  truncated: false,
                  buffer: null }
             body  { path: 'current path with / as separator',
                  size: '60053',
                  name: 'about_pic',
                  user: '5548db6769bd4a7e3595fc01' }
             */
            //先确定上传文件是否存在
            var criteria = {path:req.body.path, name:req.body.name, extension:file.extension};
            File.find(criteria).exec(function (err, data) {
                if (err) return res.send(err);
                //执行成功，还要看是否存在记录
                if(data && data.length>0){
                    //察看是否需要删除被覆盖的文件
                    var oldFile = data[0].fname;
                    if(config.uploadRemoveReplaced){
                        //console.log('found file to be replaced: ', data[0]);
                        fs.unlink(config.uploadDir + oldFile, function(){
                            //console.log('remove file success: ', config.uploadDir + '/' + oldFile);
                        });
                    }

                    //更新期字段信息
                    var replaceTime = Date.now();
                    data[0].fname    = file.name;
                    data[0].size     = req.body.size;
                    data[0].encoding = file.encoding;
                    data[0].history.unshift({name:req.body.user, date:replaceTime, type:'replace', remark:'replaced ' + oldFile});
                    data[0].save(function (err) {
                        if (err) res.send(err, file);
                        else res.json({isSuccess: true, data: file});
                    });
                }else{
                    //不存在，新增
                    var uploadTime = Date.now();
                    var f = new File();
                    f.name = req.body.name;
                    f.fname = file.name;
                    f.extension = file.extension;
                    f.mimetype = file.mimetype;
                    f.size = req.body.size;

                    f.path = req.body.path;
                    f.encoding = file.encoding;
                    f.history = [{name:req.body.user, date:uploadTime, type:'upload', ip: utils.getClientIP(req)}];
                    f.save(function (err,data) {
                        if (err) {
                            res.send(err);}
                        else
                            res.json({isSuccess: true, data: data});
                    });
                }
            });
        }
        ,rename: function (fieldname, filename, req, res) {
            return utils.generateNewName(filename)
        }
    }));

    ////再处理下载文件的请求
    //apiRouter.route('/download')
    //    .post(function (req, res){
    //        var realname = config.uploadDir + req.body.fname;
    //        var filename = req.body.filename;
    //        console.log('call download with ', realname, ', ', filename);
    //        res.download(realname, filename);
    //        return;
    //    });

    apiRouter.route('/imageUploader')
        .post(function (req, res) {
            //do nothing, 因为multer已经处理了请求，并返回了信息
            //console.log('res = ', res);
            //res.json({message: 'ok'});
        });

    //获取服务器的时间
    apiRouter.route('/systemdate')
        .get(function(req, res){
            res.json({success:true, date:new Date()});
        })
    ;

    //////////checks//////////
    apiRouter.route('/checks')
        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            //console.log('roles patch with criteria = ', criteria);
            Check.count(criteria).exec(function (err, count) {
                if (err) return res.send(err);
                res.json({success:true, count:count});
            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {create:-1};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                Check.find(criteriaFilter).sort(criteriaSort).skip(skip).limit(pageSize).populate('owner signgroup').exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            } else {
                //没有分页信息，直接返回所有数据记录
                Check.find(criteriaFilter).sort(criteriaSort).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            }
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var markPrefix = '';
            if(req.body.hasOwnProperty('markPrefix'))
                markPrefix = req.body.markPrefix;
            var marker = req.body.marker;

            //对每一个用户，新增一条批注信息
            var insertMark = req.body.detail.map(function (detail) {
                if(detail.mark)
                    return User.update({_id:detail._id},{$push:{marks:{marker:marker, mark:markPrefix + detail.mark}}});
                else
                    return User.update({_id:detail._id},{$push:{marks:{marker:marker, mark:markPrefix}}});
            });

            var check_id;
            Promise
                .all(insertMark)
                .then(function(){
                    var user            = new Check();
                    user.owner          = req.body.owner;
                    user.signgroup      = req.body.signgroup;
                    user.isAccumulated  = req.body.isAccumulated;
                    user.numExpected    = req.body.numExpected;
                    user.numReal        = req.body.numReal;
                    //重新构建抽查信息表
                    if(req.body.detail) {
                        var detail = [];
                        for(var i in req.body.detail)
                            detail.push(req.body.detail[i]._id);
                    }
                    user.detail = detail;
                    if(req.body.hasOwnProperty('remark')) user.remark = req.body.remark;

                    return user.save();
                })
                .then(function(data){
                    if(!data)
                        return Promise.reject(data);

                    //获取并保存新增对象的id
                    check_id = data._id;

                    return Promise.resolve();
                })
                .then(function(){
                    res.json({success:true, _id:check_id, message: Const.Msg.AddOK});
                })
                .catch(function(error){
                    res.send({message: '新增抽查对象失败' + JSON.stringify(error)});
                })
            ;
        })
    ;

    //////////check single//////////////////////////////
    apiRouter.route('/checks/:check_id')
        // 获取指定抽查的明细信息
        .get(function (req, res) {
            Check.findOne({_id:req.params.check_id}).populate('detail', 'code name marks')
                .exec(function (err, data) {
                    if (err)
                        return res.send(err);
                    res.json({data:data,success:true});
            });
        })

        /**
         * 用来抽查时查找符合条件的学生名单，随机抽查过程发生在客户端
         *      步骤为：
         *      1.  先查询签到对象包含的所有学生个体st;
         *      2.  如果不是累积签到，返回st供抽查；
         *      3.  否则，确定当前签到对象最近的一次全新抽查时间t；
         *      4.  查询抽查发起时间>=t,并且涉及到签到对象的所有抽查记录；
         *      5.  将每条抽查记录包含的学生名单从st中剔除；
         *      6.  返回剩下的学生名单。
         * 异常处理：只要剩下的学生名单至少有一个就成功返回名单，否则没有剩下的学生名单，则返回错误信息。
         */
        .post(function (req, res) {
            //此时传入的url参数中包含的是签到对象ID
            var signgroup = req.params.check_id;

            var candidate;
            Promise.resolve()
                .then(function(){
                    // 1.  先查询签到对象包含的匹配模式;
                    return SignGroup.findOne({_id:signgroup},{pattern:1});
                })
                .then(function(data){
                    // 1.  先查询签到对象包含的所有学生个体st;
                    if(!data || !data.pattern)
                        return Promise.reject('查询签到对象模式失败');

                    return User.find({code:{$regex:data.pattern}},{code:1,name:1});
                })
                .then(function(data){
                    if(!data || !data.length)
                        return Promise.reject('没有发现匹配的学生');
                    candidate = data;

                    if(!req.body.isAccumulated){
                        //如果是全新抽查，直接返回所有候选名单
                        res.json({success:true, candidate: candidate});
                        return Promise.resolve();
                    }

                    //    3.  否则，确定当前签到对象最近的一次全新抽查时间t；
                    return Check.find({signgroup:signgroup, isAccumulated:false},{create:1}).sort({create:-1}).limit(1);
                })
                .then(function(data){
                    if(data && data.length>0) {
                        //查询抽查发起时间>=t,并且涉及到签到对象的所有抽查记录
                        return Check.find({signgroup:signgroup, create:{$gte:data[0].create}},{detail:1});
                    }else{
                        //查询所有匹配的抽查记录
                        return Check.find({signgroup:signgroup},{detail:1});
                    }
                })
                .then(function(data){
                    if(data && data.length>0) {
                        /** 将每条抽查记录包含的学生名单从st中剔除；
                         * 步骤：  1. 将所有抽查记录中包含的学生名单合并成一个数组ss
                         *         2.   检查所有的候选名单，如果_id包含在ss中，就从候选集中删除。
                         */
                        var ss=[];
                        for(var i in data){
                            for(var k=0; k<data[i].detail.length; k++)
                                ss.push(data[i].detail[k].toString());
                        }
                        for(var j=candidate.length-1; j>-1; j--){
                            if(ss.indexOf(candidate[j]._id.toString())>-1)
                                candidate.splice(j,1);
                        }
                    }

                    res.json({success:true, candidate: candidate});
                    return Promise.resolve();
                })
                .catch(function(error){
                    res.send({message:JSON.stringify(error)});
                })
            ;
        })

        /** 用来查询指定学号的学生信息 */
        .put(function(req, res){
            //此时传入的url参数中包含的是学生学号
            var usercode = req.params.check_id;
            User.findOne({code:usercode}).select('code name')
                .exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json({data:data,success:true});
                });
        })

        // 删除指定抽查
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Check.remove({
                _id: req.params.check_id
            }, function (err) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params.check_id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        })
    ;


    //////////users//////////
    apiRouter.route('/users')
        //返回全部记录，一般用于关联
        .get(function(req, res){
            //默认使用名称的升序
            User.find({}).sort({_p_name:1}).exec(function (err, data) {
                if (err) return res.send(err);
                res.json(data);
            });
        })

        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            //console.log('roles patch with criteria = ', criteria);
            User.count(criteria).exec(function (err, count) {
                if (err) return res.send(err);
                //console.log('get userCount : ', userCount);
                res.json({success:true, count:count});
            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {code:1};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                User.find(criteriaFilter).sort(criteriaSort).skip(skip).limit(pageSize).populate('role').exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            } else {
                //没有分页信息，直接返回所有数据记录
                User.find(criteriaFilter).sort(criteriaSort).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            }
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var user      = new User();
            user.name     = req.body.name;
            user.code     = req.body.code;
            user.pwd      = req.body.pwd;
            user.role     = req.body.role;
            user.diskSize = req.body.diskSize;
            user.marks      = req.body.marks;
            if(req.body.hasOwnProperty('remark')) user.remark = req.body.remark;

            //console.log('ready to create a new supplier:', supplier);
            //console.log('pinyin of ', supplier.name, ' = ', Pinyin.getFullChars(supplier.name));
            user.save(function (err) {
                if (err) {
                    if (err.code == 11000)
                        return res.json({message: Const.Msg.Duplicate});
                    else
                        return res.send(err);
                }
                ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + user._id);

                //为每个普通用户新建一个目录，允许该用户在各自的目录里面进行修改操作
                //目录的名称就是用户Code
                var fo       = new File();
                fo.name      = user.code;
                fo.path      = '.';
                fo.isFile    = false;
                fo.extension = 'folder';
                fo.history   = [{name:req.decoded._id,type:'create'}];
                fo.save(function (err) {
                    if (err) return res.send(err);
                    res.json({success:true, message: Const.Msg.AddOK});
                });
            });
        })
    ;

    apiRouter.route('/usersop')
        // 为了插班生生成试卷获取指定代码的插班生用户信息
        .patch(function (req, res) {
            //先检查该学号的学生是否存在
            User.find({code:req.body.code}).exec(function (err, data) {
                if (err) return res.send(err);
                if (!data || data.length<1)
                    return res.send('没有发现匹配 [' + req.body.code + '] 的用户');

                //然后再看看是否已经生成了试卷
                var user = data[0];
                Exam.find({tester:user._id, config:req.body.config}).exec(function (err, data) {
                    if (err) return res.send(err);
                    if (data && data.length>0)
                        return res.send('该学生 [' + req.body.code + '] 已经生成了试卷');
                    res.json({data:user, success:true});
                });
            });
        })
    ;

    //////////user_id//////////////////////////////
    apiRouter.route('/users/:user_id')
        // 获取指定用户的信息
        .get(function (req, res) {
            User.findById(req.params.user_id, function (err, user) {
                if (err)
                    return res.send(err);

                //计算用户的实际容量，查询条件是位置在当前用户下的所有文件
                //当然Admin用户不用统计
                user.usedSize = 0;
                if(user.code!='admin') {
                    var path = './' + user.code;
                    var pathReg = (path+'/').replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
                    //在用户目录下，或者是以用户目录为前缀的文件都需要统计
                    var criteriaDir = {'$or':[{path:path},{path:{$regex:'^('+ pathReg + ')'}}], isFile:true};
                    File.find(criteriaDir).select('size')
                        .exec(function (err, data) {
                            if (err) return res.send(err);
                            var usedSize = 0;
                            if(data){
                                for(var i=0; i<data.length; i++)
                                    if(data[i].size)
                                        usedSize += data[i].size;
                            }
                            user.usedSize = usedSize;
                            res.json({data:user,success:true});
                        });
                }else{
                    res.json({data:user,success:true});
                }
            });
        })

        // 用于插入新的批注信息
        .post(function (req, res) {
            Promise.resolve()
                .then(function(){
                    return User.update({_id:req.params.user_id},{$push:
                        {marks:{marker:req.body.marker, mark:req.body.mark}}});
                })
                .then(function(){
                    if(!data || !data.ok)
                        return Promise.reject('更新失败');

                    res.json({success:true});
                    return Promise.resolve();
                })
                .catch(function(error){
                    res.send({message: '新增用户批注信息失败' + JSON.stringify(error)});
                })
            ;
        })

        // 更新指定id用户信息
        .put(function (req, res) {
            //暂时不做权限处理
            //if(!ServerLogger.allowed('user','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            User.findById(req.params.user_id, function (err, user) {
                if (err) return res.send(err);
                if (req.body.name) user.name         = req.body.name;
                if (req.body.code) user.code         = req.body.code;
                if (req.body.pwd) user.pwd           = req.body.pwd;
                if (req.body.hasOwnProperty('marks')) user.marks           = req.body.marks;
                if (req.body.hasOwnProperty('remark')) user.remark     = req.body.remark;
                if (req.body.role) user.role         = req.body.role;
                if (req.body.diskSize) user.diskSize = req.body.diskSize;

                user.save(function (err) {
                    //console.log('error = ',err);
                    if (err)
                        return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    res.json({success:true, message: Const.Msg.UpdateOK});
                });

            });
        })

        // 删除指定用户
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            User.remove({
                _id: req.params.user_id
            }, function (err, user) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params.user_id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        })
    ;

    //////////试题//////////
    apiRouter.route('/questions')
        //返回全部记录，一般用于关联
        .get(function(req, res){
            //默认使用名称的升序
            Question.find({}).sort({name:1}).exec(function (err, data) {
                if (err) return res.send(err);
                res.json(data);
            });
        })

        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            //console.log('roles patch with criteria = ', criteria);
            Question.count(criteria).exec(function (err, count) {
                if (err) return res.send(err);
                //console.log('get userCount : ', userCount);
                res.json({success:true, count:count});
            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                Question.find(criteriaFilter).sort(criteriaSort).skip(skip).limit(pageSize).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            } else {
                //没有分页信息，直接返回所有数据记录
                Question.find(criteriaFilter).sort(criteriaSort).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            }
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var codeType = 'question';
            var _id;
            //保存新试题分为三步，首先获取最大试题编号，再保存，最后更新最大编号
            Promise.resolve()
                .then(function(){
                    //1. 查询最大编号
                    return System.findOne({codeType:codeType},{maxNo:1});
                })
                .then(function(data){
                    if(!data || !data.maxNo)
                        return Promise.reject('查询试题最大编号失败');
                    //2.用此编号来设定数据的code字段
                    var user      = new Question();
                    user.code = utils.generateCode(codeType, data.maxNo);
                    user.lastModified = new Date();
                    user.category = req.body.category;
                    user.type = req.body.type;
                    user.point = req.body.point;
                    user.form = req.body.form;
                    if(req.body.hasOwnProperty('remark')) user.remark = req.body.remark;
                    return user.save();
                })
                .then(function(data){
                    if(!data) //save的返回是新增的对象
                        return Promise.reject('保存新试题失败');
                    _id = data._id;
                    //更新编号
                    return System.update({codeType:codeType},{$inc:{'maxNo':1}});

                })
                .then(function(data){
                    if(!data || !data.ok) //update $inc的返回{n:1, nModified:1, ok:1}
                        return Promise.reject('更新最大编号失败');
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + _id);
                    res.json({success:true, message: Const.Msg.AddOK});
                    return Promise.resolve();
                })
                .catch(function(error){
                    res.send(error);
                })
            ;
        })
    ;

    ////////////////////////////////////////
    apiRouter.route('/questions/:_id')
        // 获取指定用户的信息
        .get(function (req, res) {
            Question.findById(req.params._id, function (err, user) {
                if (err)
                    return res.send(err);
                res.json({data:user,success:true});
            });
        })

        // 更新指定id用户信息
        .put(function (req, res) {
            //暂时不做权限处理
            //if(!ServerLogger.allowed('user','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Question.findById(req.params._id, function (err, user) {
                if (err) return res.send(err);
                if (req.body.name) user.name         = req.body.name;
                if (req.body.category) user.category = req.body.category;
                if (req.body.type) user.type = req.body.type;
                if (req.body.point) user.point = req.body.point;
                if (req.body.form) user.form = req.body.form;
                if (req.body.hasOwnProperty('remark')) user.remark     = req.body.remark;
                user.lastModified = new Date();

                user.save(function (err) {
                    //console.log('error = ',err);
                    if (err)
                        return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    res.json({success:true, message: Const.Msg.UpdateOK});
                });

            });
        })

        /** 合并多个试题到当前试题中
         * 步骤为：
         *  1.  查询所有的涉及的试题对象
         *  2.  定位需要保留的试题对象
         *  3.  遍历所有查询到的试题对象，将样式数组合并到保留试题对象中
         *  4.  修改保留试题的修改时间和样式数量，并保存到数据库
         *  5.  删除其他试题对象
         *  6.  返回 合并后的试题编号，_id和样式数量到客户端
         */
        .post(function (req, res) {
            var info;
            var qAll = req.body;
            var forms = [];

            Promise.resolve()
                .then(function(){
                    //用传过来的参数执行查询
                    return Question.find(qAll);
                })
                .then(function(data){
                    //扫描所有的试题，定位需要保留的试题对象，收集其他的试题的样式
                    for(var i= 0, len=data.length; i<len; i++){
                        if(data[i]._doc._id == req.params._id){
                            info = {_id:data[i]._doc._id, code:data[i]._doc.code};
                        }
                        forms = forms.concat(data[i]._doc.form);
                    }
                    info.numForm = forms.length;

                    //修改保留试题的修改时间和样式数量，并保存到数据库
                    return Question.update({_id:req.params._id},{$set:{
                        lastModified:new Date()
                        ,numForm : forms.length
                        ,form: forms
                    }});
                })
                .then(function(data){
                    if(!data || data.ok!=1) //update 的返回{n:1, nModified:1, ok:1}
                        return Promise.reject('保存合并试题失败');

                    //需要将保留试题的ID从条件中删除，即第一个ID
                    qAll._id['$in'].splice(0,1);
                    //删除其他试题
                    return Question.remove(qAll);
                })
                .then(function(data){
                    if(!data || data.result.ok!=1) //delete的返回是 CommandResult {result:{n:1, ok:1}}
                        return Promise.reject('删除合并后的试题失败');
                    info.success = true;
                    return res.json(info);
                })
                .catch(function(error){
                    res.send(error);
                })
            ;
        })

        // 删除指定用户
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Question.remove({
                _id: req.params._id
            }, function (err, user) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params._id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        });

    //////////试卷//////////
    apiRouter.route('/sheets')
        //返回全部记录，一般用于关联
        .get(function(req, res){
            //默认使用名称的升序
            Sheet.find({}).sort({name:1}).exec(function (err, data) {
                if (err) return res.send(err);
                res.json(data);
            });
        })

        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            //console.log('roles patch with criteria = ', criteria);
            Sheet.count(criteria).exec(function (err, count) {
                if (err) return res.send(err);
                //console.log('get userCount : ', userCount);
                res.json({success:true, count:count});
            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {name:1};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                Sheet.find(criteriaFilter).sort(criteriaSort).skip(skip)
                    .populate('detail.category').limit(pageSize).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            } else {
                //没有分页信息，直接返回所有数据记录
                Sheet.find(criteriaFilter).sort(criteriaSort).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            }
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var codeType = 'sheet';
            var _id;
            //保存新试题分为三步，首先获取最大试题编号，再保存，最后更新最大编号
            Promise.resolve()
                .then(function(){
                    //1. 查询最大编号
                    return System.findOne({codeType:codeType},{maxNo:1});
                })
                .then(function(data){
                    if(!data || !data.maxNo)
                        return Promise.reject('查询试题最大编号失败');
                    //2.用此编号来设定数据的code字段
                    var user      = new Sheet();
                    user.code = utils.generateCode(codeType, data.maxNo);
                    user.name = req.body.name;
                    user.detail = req.body.detail;
                    user.lastModified = new Date();
                    if(req.body.hasOwnProperty('remark')) user.remark = req.body.remark;

                    return user.save();
                })
                .then(function(data){
                    if(!data) //save的返回是新增的对象
                        return Promise.reject('保存新试题失败');
                    _id = data._id;
                    //更新编号
                    return System.update({codeType:codeType},{$inc:{'maxNo':1}});

                })
                .then(function(data){
                    if(!data || !data.ok) //update $inc的返回{n:1, nModified:1, ok:1}
                        return Promise.reject('更新最大编号失败');
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + _id);
                    res.json({success:true, message: Const.Msg.AddOK});
                    return Promise.resolve();
                })
                .catch(function(error){
                    res.send(error);
                })
            ;
        });

    ////////////////////////////////////////
    //试卷的聚合请求，查询各类属和类型包含的试题数量
    ////////////////////////////////////////
    apiRouter.route('/sheetop')
        .get(function (req, res) {
            Question.aggregate(
                [{$group:{_id:{category:"$category",type:"$type"},count:{$sum:1}}}]
            ).exec(function(err,ret) {
                if (err)
                    return res.send(err);
                res.json({data:ret,success:true});
            });
        })
    ;

    ////////////////////////////////////////
    apiRouter.route('/sheets/:_id')
        // 获取指定用户的信息
        .get(function (req, res) {
            Sheet.find({_id:req.params._id}).populate('detail.category').exec(function (err, data) {
                if (err)
                    return res.send(err);
                res.json({data:data,success:true});
            });
        })

        // 更新指定id用户信息
        .put(function (req, res) {
            //暂时不做权限处理
            //if(!ServerLogger.allowed('user','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Sheet.findById(req.params._id, function (err, user) {
                if (err) return res.send(err);
                if (req.body.name) user.name         = req.body.name;
                if (req.body.detail) user.detail = req.body.detail;
                user.lastModified = new Date();
                if (req.body.hasOwnProperty('remark')) user.remark     = req.body.remark;

                user.save(function (err) {
                    //console.log('error = ',err);
                    if (err)
                        return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    res.json({success:true, message: Const.Msg.UpdateOK});
                });

            });
        })

        // 删除指定用户
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Sheet.remove({
                _id: req.params._id
            }, function (err, user) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params._id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        });

    //////////试题类属//////////
    apiRouter.route('/qcategorys')
        //返回全部记录，一般用于关联
        .get(function(req, res){
            //默认使用名称的升序
            QCategory.find({}).sort({name:1}).exec(function (err, data) {
                if (err) return res.send(err);
                res.json(data);
            });
        })

        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            //console.log('roles patch with criteria = ', criteria);
            QCategory.count(criteria).exec(function (err, count) {
                if (err) return res.send(err);
                //console.log('get userCount : ', userCount);
                res.json({success:true, count:count});
            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {name:1};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                QCategory.find(criteriaFilter).sort(criteriaSort).skip(skip).limit(pageSize).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            } else {
                //没有分页信息，直接返回所有数据记录
                QCategory.find(criteriaFilter).sort(criteriaSort).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            }
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var user      = new QCategory();
            user.name     = req.body.name;
            if(req.body.hasOwnProperty('remark')) user.remark = req.body.remark;

            //console.log('ready to create a new supplier:', supplier);
            //console.log('pinyin of ', supplier.name, ' = ', Pinyin.getFullChars(supplier.name));
            user.save(function (err) {
                if (err) {
                    return res.send(err);
                }
                ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + user._id);
                res.json({success:true, message: Const.Msg.AddOK});
            });
        });

    ////////////////////////////////////////
    apiRouter.route('/qcategorys/:_id')
        // 获取指定用户的信息
        .get(function (req, res) {
            QCategory.findById(req.params._id, function (err, user) {
                if (err)
                    return res.send(err);
                res.json({data:user,success:true});
            });
        })

        // 更新指定id用户信息
        .put(function (req, res) {
            //暂时不做权限处理
            //if(!ServerLogger.allowed('user','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            QCategory.findById(req.params._id, function (err, user) {
                if (err) return res.send(err);
                if (req.body.name) user.name         = req.body.name;
                if (req.body.hasOwnProperty('remark')) user.remark     = req.body.remark;

                user.save(function (err) {
                    //console.log('error = ',err);
                    if (err)
                        return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    res.json({success:true, message: Const.Msg.UpdateOK});
                });

            });
        })

        // 删除指定用户
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            QCategory.remove({
                _id: req.params._id
            }, function (err, user) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params._id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        });

    //////////考试//////////
    apiRouter.route('/examconfigs')
        //返回全部记录，一般用于关联
        .get(function(req, res){
            //默认使用名称的升序
            ExamConfig.find({}).sort({name:1}).exec(function (err, data) {
                if (err) return res.send(err);
                res.json(data);
            });
        })

        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            //console.log('roles patch with criteria = ', criteria);
            ExamConfig.count(criteria).exec(function (err, count) {
                if (err) return res.send(err);
                //console.log('get userCount : ', userCount);
                res.json({success:true, count:count});
            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {name:1};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                ExamConfig.find(criteriaFilter)
                    .populate('sheet', 'name')
                    .sort(criteriaSort).skip(skip).limit(pageSize).exec(function (err, data) {
                    if (err) return res.send(err);

                    //考试的状态是要根据当前的时间来决定的，由于客户端的时间不准确，需要统一用服务器的时间，这里先计算
                    //考试的状态后再发送到客户端
                    var now = new Date();
                    var begin;
                    for(var i in data){
                        //考试状态只有已经发布的考试才有。
                        if(data[i].isPublic) {
                            //考试的状态只有三种，未开始、考试中、已结束，分别根据当前时间是在开始时间和结束时间之前后来决定
                            if (data[i].dateEnd < now)
                                data[i]._doc.status = '已结束';
                            else {//开始时间需要考虑提前分钟数
                                if (now < data[i].dateBeginAhead)
                                    data[i]._doc.status = '未开始';
                                else
                                    data[i]._doc.status = '考试中';
                            }
                        }
                    }

                    res.json(data);
                });
            } else {
                //没有分页信息，直接返回所有数据记录
                ExamConfig.find(criteriaFilter).sort(criteriaSort).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            }
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var codeType = 'examconfig';
            var _id;
            //保存新试题分为三步，首先获取最大试题编号，再保存，最后更新最大编号
            Promise.resolve()
                .then(function(){
                    //1. 查询最大编号
                    return System.findOne({codeType:codeType},{maxNo:1});
                })
                .then(function(data){
                    if(!data || !data.maxNo)
                        return Promise.reject('查询试题最大编号失败');
                    //2.用此编号来设定数据的code字段
                    var user      = new ExamConfig();
                    user.code = utils.generateCode(codeType, data.maxNo);
                    user.name     = req.body.name;
                    user.sheet = req.body.sheet ;
                    user.dateBegin = req.body.dateBegin ;
                    user.dateEnd = req.body.dateEnd ;
                    user.ipPattern = req.body.ipPattern;
                    user.ipPatternB = utils.formatIpPattern(req.body.ipPattern);
                    user.minAhead = req.body.minAhead;
                    user.numTemplate = req.body.numTemplate ;
                    user.pattern = req.body.pattern ;
                    user.canReview = req.body.canReview;
                    user.isFull = req.body.isFull;
                    user.autoCorrect = req.body.autoCorrect;
                    user.lastModified = new Date();
                    if(req.body.hasOwnProperty('remark')) user.remark = req.body.remark;
                    return user.save();
                })
                .then(function(data){
                    if(!data) //save的返回是新增的对象
                        return Promise.reject('保存新试题失败');
                    _id = data._id;
                    //更新编号
                    return System.update({codeType:codeType},{$inc:{'maxNo':1}});

                })
                .then(function(data){
                    if(!data || !data.ok) //update $inc的返回{n:1, nModified:1, ok:1}
                        return Promise.reject('更新最大编号失败');
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + _id);
                    res.json({success:true, message: Const.Msg.AddOK, _id: _id});
                    return Promise.resolve();
                })
                .catch(function(error){
                    res.send(error);
                })
            ;
        });

    ////////////////////////////////////////
    //考试设置操作的请求
    ////////////////////////////////////////
    apiRouter.route('/examconfigsop/:_id')
        // 更新状态
        .put(function (req, res) {
            //暂时不做权限处理
            //if(!ServerLogger.allowed('user','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            ExamConfig.findById(req.params._id, function (err, user) {
                if (err) return res.send(err);
                var date = new Date();
                if (req.body.hasOwnProperty('isGenerated')) {
                    user.isGenerated = req.body.isGenerated;
                    user.dateGenerated = date;
                    if(!user.isGenerated)
                        user.dateGenerated = null;
                }
                if (req.body.hasOwnProperty('isPublic')) {
                    user.isPublic = req.body.isPublic;
                    user.datePublic = date;
                }
                user.lastModified = date;
                user.save(function (err) {
                    //console.log('error = ',err);
                    if (err)
                        return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    res.json({success:true, message: Const.Msg.UpdateOK, date:date});
                });

            });
        })

        //用于考试统计中的试卷信息收集，仅需要考生，交卷，判卷和分数信息
        .get(function (req, res) {
            Exam.find({config:req.params._id},{score:1,isSubmit:1,dateSubmit:1,isCorrected:1
                    ,dateCorrect:1,tester:1})
                .populate('tester', 'code name')
                .exec(function (err, data) {
                if (err) return res.send(err);
                res.json({data:data,success:true});
            });

        })

        //用于考试统计中试卷参加和交卷的IP检查
        .patch(function (req, res) {
            Exam.find({config:req.params._id})
                .populate('tester', 'name code')
                .select('tester score dateSubmit dateRead submitIP readIP isRead isSubmit')
                .exec(function (err, data) {
                if (err) return res.send(err);
                res.json({success:true, data:data});
            });
        })
    ;

    ////////////////////////////////////////
    apiRouter.route('/examconfigs/:_id')
        .get(function (req, res) {
            ExamConfig.findById(req.params._id, function (err, user) {
                if (err)
                    return res.send(err);
                res.json({data:user,success:true});
            });
        })

        //用来查询当前考试设置关联的试卷数量
        .patch(function (req, res) {
            Exam.count({config:req.params._id}).exec(function (err, count) {
                if (err) return res.send(err);
                //console.log('get userCount : ', userCount);
                res.json({success:true, count:count});
            });
        })

        // 更新指定id用户信息
        .put(function (req, res) {
            //暂时不做权限处理
            //if(!ServerLogger.allowed('user','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            ExamConfig.findById(req.params._id, function (err, user) {
                if (err) return res.send(err);
                if (req.body.name) user.name                    = req.body.name;
                if (req.body.sheet) user.sheet                  = req.body.sheet;
                if (req.body.dateBegin) user.dateBegin          = req.body.dateBegin;
                if (req.body.dateEnd) user.dateEnd              = req.body.dateEnd;
                user.minAhead                                   = req.body.minAhead;
                user.lastModified = new Date();
                if (req.body.pattern) user.pattern              = req.body.pattern;
                if (req.body.numTemplate) user.numTemplate      = req.body.numTemplate;
                if (req.body.hasOwnProperty('canReview')) user.canReview                = req.body.canReview;
                if (req.body.hasOwnProperty('isFull')) user.isFull                = req.body.isFull;
                if (req.body.hasOwnProperty('remark')) user.remark                = req.body.remark;
                if (req.body.hasOwnProperty('ipPattern')){
                    user.ipPattern      = req.body.ipPattern;
                    user.ipPatternB     = utils.formatIpPattern(req.body.ipPattern);
                }
                if (req.body.hasOwnProperty('autoCorrect')) user.autoCorrect                = req.body.autoCorrect;

                user.save(function (err) {
                    //console.log('error = ',err);
                    if (err)
                        return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    res.json({success:true, message: Const.Msg.UpdateOK});
                });

            });
        })

        // 删除指定用户
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            ExamConfig.remove({
                _id: req.params._id
            }, function (err, user) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params._id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        })

        //删除考试设置已经生成的试卷，准备重新生成
        .post(function (req, res){
            Exam.remove({
                config: req.params._id
            }, function (err) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params._id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        })
    ;

    ///////////////////////////////////////////
    //考试试卷
    apiRouter.route('/exams')
        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            /**
             * 考试试卷查询可能有几个特殊的查询条件
             * 可能的参数有：
             *  config          考试设置ID数组
             *  configStatus    考试状态数组
             *  point           总分范围
             *  submitStatus    考试成绩状态数组
             *  testerKey       考生学号或姓名匹配关键字
             */
            Promise.resolve()
                .then(function(){ //查询需要满足的所有考试IDs
                    //试卷只能查看发布的试卷，所以这里需要查询所有状态为已发布的考试ID，以此作为查询的条件
                    var cr = {};
                    //除了重新生成试卷时查询已提交试卷的数量，
                    //其他查询试卷的动作都要求试卷已经发布
                    //修改允许管理员查看未发布但已经生成的试卷
                    if(!req.body.isRegenerating) {
                        if(criteria.hasOwnProperty('isPublic')) {
                            cr.isPublic = criteria.isPublic;
                            delete criteria.isPublic;
                        }
                    }

                    //是否有筛选考试Id的条件
                    if(criteria.hasOwnProperty('config')){
                        cr['_id'] = criteria.config;

                        //暂时从查询条件中删除
                        delete criteria.config;
                    }

                    //是否要筛选考试的状态
                    if(criteria.hasOwnProperty('configStatus')){
                        var now = new Date();
                        if(criteria.configStatus && criteria.configStatus['$in']){
                            var statuss = criteria.configStatus['$in'];
                            //一个查询条件
                            if(statuss.length==1){
                                if(statuss[0] == '未开始'){
                                    cr['dateBeginAhead'] = {'$gt':now};
                                }else if(statuss[0] == '已结束'){
                                    cr['dateEnd'] = {'$lt':now};
                                }else if(statuss[0] == '考试中'){
                                    cr['dateEnd'] = {'$gt':now};
                                    cr['dateBeginAhead'] = {'$lt':now};
                                }
                            }else if(statuss.length==2){
                                //两个查询条件
                                if(statuss.indexOf('未开始')<0){
                                    //不含未开始，则表示考试中和已结束两种，即当前时间在考试开始时间之后的
                                    cr['dateBeginAhead'] = {'$lt':now};
                                }else if(statuss.indexOf('已结束')<0){
                                    //不含已结束，则表示未开始和考试中两种，即考试结束时间大于当前时间
                                    cr['dateEnd'] = {'$gt':now};
                                }else if(statuss.indexOf('考试中')<0){
                                    //不含考试中，则表示要么已经结束，要么还没有开始
                                    cr['dateEnd'] = {'$lt':now};
                                    cr['dateBeginAhead'] = {'$gt':now};
                                }
                            }
                        }

                        //从查询条件中删除
                        delete criteria.configStatus;
                    }

                    //是否要筛选考试的发布状态
                    if(criteria.hasOwnProperty('publicStatus')){
                        if(criteria.publicStatus && criteria.publicStatus['$in']){
                            var statuss = criteria.publicStatus['$in'];
                            //一个查询条件
                            if(statuss.length==1){
                                if(statuss[0] == '已发布'){
                                    cr['isPublic'] = true;
                                }else if(statuss[0] == '未发布'){
                                    cr['isPublic'] = false;
                                }
                            }
                        }

                        //从查询条件中删除
                        delete criteria.publicStatus;
                    }

                    return ExamConfig.find(cr,{_id:1});
                })
                .then(function(data) {//拼接成查询条件
                    var ps = [];
                    for (var i in data) {
                        ps.push(data[i]._id);
                    }
                    criteria.config = {$in: ps};

                    //是否有对学生的筛选
                    if(criteria.hasOwnProperty('testerKey')){
                        //查询条件是学生的ID或者姓名包含了筛选关键字的
                        return User.find({'$or':[{'code':criteria.testerKey},{'name':criteria.testerKey}]},{_id:1});
                    }
                    else return Promise.resolve();
                })
                .then(function(data){
                    if(criteria.hasOwnProperty('testerKey')){
                        //从查询条件中删除
                        delete criteria.testerKey;
                    }
                    if(data) {
                        //有匹配学生的结果
                        var ps = [];
                        for (var i in data) {
                            ps.push(data[i]._id);
                        }
                        criteria.tester = {$in: ps};
                    }

                    //是否对试卷的交卷和判卷状态有要求
                    if(criteria.hasOwnProperty('submitStatus')){
                        //转化成 isSubmit 和 isCorrected 两个的筛选条件
                        //'未交卷','已交卷，未判卷','已判卷'
                        if(criteria.submitStatus && criteria.submitStatus['$in']) {
                            var statuss = criteria.submitStatus['$in'];
                            //一个查询条件
                            if(statuss.length==1){
                                if(statuss[0] == '未交卷'){
                                    criteria['isSubmit'] = false;
                                }else if(statuss[0] == '已判卷'){
                                    criteria['isCorrected'] = true;
                                }else if(statuss[0] == '已交卷，未判卷'){
                                    criteria['isCorrected'] = false;
                                    criteria['isSubmit'] = true;
                                }
                            }else if(statuss.length==2){
                                //两个查询条件
                                if(statuss.indexOf('未交卷')<0){
                                    //不含未交卷
                                    criteria['isSubmit'] = true;
                                }else if(statuss.indexOf('已判卷')<0){
                                    //不含已判卷
                                    criteria['isCorrected'] = false;
                                }else if(statuss.indexOf('已交卷，未判卷')<0){
                                    //不含已交卷，未判卷，即要不未交卷，要不已经交卷并判分
                                    criteria['$or'] = [{isSubmit:false}, {isSubmit:true, isCorrected:true}];
                                }
                            }
                        }

                        delete criteria.submitStatus;
                    }
                    //查询匹配的记录个数
                    return Exam.count(criteria);
                })
                .then(function(data){//处理查询个数的结果
                    return res.json({success:true, count:data});
                })
                .catch(function (err) {
                    if (err) return res.send(err);
                    return res.send('');
                })
            ;
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteria = {};
            if(req.body.criteriaFilter){
                criteria = req.body.criteriaFilter;
            }
            //试卷只能查看发布的试卷，所以这里需要查询所有状态为已发布的考试ID，以此作为查询的条件
            Promise.resolve()
                .then(function(){ //查询已经发布的所有考试IDs
                    //试卷只能查看发布的试卷，所以这里需要查询所有状态为已发布的考试ID，以此作为查询的条件
                    var cr = {};
                    if(criteria.hasOwnProperty('isPublic')) {
                        cr.isPublic = criteria.isPublic;
                        delete criteria.isPublic;
                    }

                    //是否有筛选考试Id的条件
                    if(criteria.hasOwnProperty('config')){
                        cr['_id'] = criteria.config;

                        //暂时从查询条件中删除
                        delete criteria.config;
                    }

                    //是否要筛选考试的状态
                    if(criteria.hasOwnProperty('configStatus')){
                        var now = new Date();
                        if(criteria.configStatus && criteria.configStatus['$in']){
                            var statuss = criteria.configStatus['$in'];
                            //一个查询条件
                            if(statuss.length==1){
                                if(statuss[0] == '未开始'){
                                    cr['dateBeginAhead'] = {'$gt':now};
                                }else if(statuss[0] == '已结束'){
                                    cr['dateEnd'] = {'$lt':now};
                                }else if(statuss[0] == '考试中'){
                                    cr['dateEnd'] = {'$gt':now};
                                    cr['dateBeginAhead'] = {'$lt':now};
                                }
                            }else if(statuss.length==2){
                                //两个查询条件
                                if(statuss.indexOf('未开始')<0){
                                    //不含未开始，则表示考试中和已结束两种，即当前时间在考试开始时间之后的
                                    cr['dateBeginAhead'] = {'$lt':now};
                                }else if(statuss.indexOf('已结束')<0){
                                    //不含已结束，则表示未开始和考试中两种，即考试结束时间大于当前时间
                                    cr['dateEnd'] = {'$gt':now};
                                }else if(statuss.indexOf('考试中')<0){
                                    //不含考试中，则表示要么已经结束，要么还没有开始
                                    cr['dateEnd'] = {'$lt':now};
                                    cr['dateBeginAhead'] = {'$gt':now};
                                }
                            }
                        }

                        //从查询条件中删除
                        delete criteria.configStatus;
                    }

                    //是否要筛选考试的发布状态
                    if(criteria.hasOwnProperty('publicStatus')){
                        if(criteria.publicStatus && criteria.publicStatus['$in']){
                            var statuss = criteria.publicStatus['$in'];
                            //一个查询条件
                            if(statuss.length==1){
                                if(statuss[0] == '已发布'){
                                    cr['isPublic'] = true;
                                }else if(statuss[0] == '未发布'){
                                    cr['isPublic'] = false;
                                }
                            }
                        }

                        //从查询条件中删除
                        delete criteria.publicStatus;
                    }
                    return ExamConfig.find(cr,{_id:1});
                })
                .then(function(data) {//拼接成查询条件
                    var ps = [];
                    for (var i in data) {
                        ps.push(data[i]._id);
                    }
                    criteria.config = {$in: ps};

                    //是否有对学生的筛选
                    if(criteria.hasOwnProperty('testerKey')){
                        //查询条件是学生的ID或者姓名包含了筛选关键字的
                        return User.find({'$or':[{'code':criteria.testerKey},{'name':criteria.testerKey}]},{_id:1});
                    }
                    else return Promise.resolve();
                })
                .then(function(data){
                    if(criteria.hasOwnProperty('testerKey')){
                        //从查询条件中删除
                        delete criteria.testerKey;
                    }
                    if(data) {
                        //有匹配学生的结果
                        var ps = [];
                        for (var i in data) {
                            ps.push(data[i]._id);
                        }
                        criteria.tester = {$in: ps};
                    }

                    //是否对试卷的交卷和判卷状态有要求
                    if(criteria.hasOwnProperty('submitStatus')){
                        //转化成 isSubmit 和 isCorrected 两个的筛选条件
                        //'未交卷','已交卷，未判卷','已判卷'
                        if(criteria.submitStatus && criteria.submitStatus['$in']) {
                            var statuss = criteria.submitStatus['$in'];
                            //一个查询条件
                            if(statuss.length==1){
                                if(statuss[0] == '未交卷'){
                                    criteria['isSubmit'] = false;
                                }else if(statuss[0] == '已判卷'){
                                    criteria['isCorrected'] = true;
                                }else if(statuss[0] == '已交卷，未判卷'){
                                    criteria['isCorrected'] = false;
                                    criteria['isSubmit'] = true;
                                }
                            }else if(statuss.length==2){
                                //两个查询条件
                                if(statuss.indexOf('未交卷')<0){
                                    //不含未交卷
                                    criteria['isSubmit'] = true;
                                }else if(statuss.indexOf('已判卷')<0){
                                    //不含已判卷
                                    criteria['isCorrected'] = false;
                                }else if(statuss.indexOf('已交卷，未判卷')<0){
                                    //不含已交卷，未判卷，即要不未交卷，要不已经交卷并判分
                                    criteria['$or'] = [{isSubmit:false}, {isSubmit:true, isCorrected:true}];
                                }
                            }
                        }

                        delete criteria.submitStatus;
                    }

                    var criteriaSort = {tester:1};

                    if (req.body.currentPage && req.body.pageSize) {
                        var skip     = req.body.currentPage;
                        var pageSize = req.body.pageSize;
                        //计算需要需要跳过的文档数量
                        skip = (skip - 1) * pageSize;
                        return Exam.find(criteria,{config:1,tester:1,score:1,point:1,dateGenerated:1
                            ,dateSubmit:1,submitIP:1,isSubmit:1,isCorrected:1,dateCorrect:1})
                            .populate('config', 'name isPublic canReview dateBeginAhead dateEnd dateBegin minAhead')
                            .populate('tester', 'name code')
                            .sort(criteriaSort).skip(skip).limit(pageSize);
                    } else {
                        //没有分页信息，直接返回所有数据记录
                        return Exam.find(criteria).sort(criteriaSort);
                    }
                })
                .then(function(data){//处理查询结果
                    //根据当前时间更新考试的状态
                    var now = new Date();
                    for(var i in data) {
                        //考试的状态只有三种，未开始、考试中、已结束，分别根据当前时间是在开始时间和结束时间之前后来决定
                        if (data[i].config.dateEnd < now)
                            data[i]._doc.config._doc.status = '已结束';
                        else {//开始时间需要考虑提前分钟数
                            if (now < data[i].config.dateBeginAhead)
                                data[i]._doc.config._doc.status = '未开始';
                            else
                                data[i]._doc.config._doc.status = '考试中';
                        }
                    }

                    return res.json(data);
                })
                .catch(function (err) {
                    if (err) return res.send(err);
                    return res.send('');
                })
            ;


        })

        //用来新增记录，这个过程只能由生成试卷的动作来触发
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var user      = new Exam();
            user.config     = req.body.config;
            user.tester = req.body.tester ;
            user.point = req.body.point ;
            user.questions = req.body.questions ;
            user.ansExpect = req.body.ansExpect ;
            user.dateGenerated = Date.now();

            //console.log('ready to create a new supplier:', supplier);
            //console.log('pinyin of ', supplier.name, ' = ', Pinyin.getFullChars(supplier.name));
            user.save(function (err) {
                if (err) {
                    return res.send(err);
                }
                ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + user._id);
                res.json({success:true, message: Const.Msg.AddOK});
            });
        });

    ////////////////////////////////////////
    apiRouter.route('/exams/:_id')
        // 获取指定试卷的信息
        .patch(function (req, res) {
            Exam.findById(req.params._id)
                .populate('config','name dateEnd dateBegin dateBeginAhead canReview ipPattern ipPatternB')
                .populate('tester','name code')
                .exec(function (err, user) {
                    if (err)
                        return res.send(err);
                    if (!user)
                        return res.send('指定试卷不存在，id=' + req.params._id);

                    var ip = utils.getClientIP(req);
                    //计算考试的状态
                    var now = new Date();
                    //考试的状态只有三种，未开始、考试中、已结束，分别根据当前时间是在开始时间和结束时间之前后来决定
                    if (user.config.dateEnd < now)
                        user._doc.config._doc.status = '已结束';
                    else {//开始时间需要考虑提前分钟数
                        if (now < user.config.dateBeginAhead)
                            user._doc.config._doc.status = '未开始';
                        else
                            user._doc.config._doc.status = '考试中';
                    }

                    /** 查看是否具有查看试卷的权限，防止用户通过直接输入URL来获取试卷内容
                     * 1. 除了管理员具有查看试卷的权限以外，其他人均只能查看自己的试卷
                     * 2. 查看试卷时必须该考试已经结束，并且考试设定为可复卷的状态
                     * 3. 参加考试则必须考试仍旧在进行中
                     * 4. 所有其他情形都返回错误提示信息。
                     */
                    if(req.decoded.code != 'admin'){
                        if(req.decoded._id != user.tester._id)
                            return res.send({message:'不允许查看他人试卷'});
                        if(req.body.type == 'view'){
                            if(!user.config._doc.canReview){
                                return res.send({message:'该试卷未开放复卷功能'});
                            }else if(user._doc.config._doc.status != '已结束')
                                return res.send({message:'查看试卷只能在考试结束后'});
                        }else if(req.body.type == 'test'){
                            if(user._doc.config._doc.status != '考试中')
                                return res.send({message:'当前考试状态不允许参加考试[状态=' + user._doc.config._doc.status + ']'});
                            /** 试卷仅允许一次打开，第二次以上打开，则显示错误信息*/
                            if(user.isRead)
                                return res.send({message: '该套试卷已经被其他人答题，不能重复答题[ ' + user.readIP + ', ' + user.dateRead + ']'});
                            /** 已经提交的试卷不能二次答题 */
                            if(user.isSubmit)
                                return res.send({message:'该套试卷已经交卷，不能再次答题[ ' + user.submitIP + ', ' + user.dateSubmit + ']'});
                            /** ip 检查 */
                            var pattern = user._doc.config._doc.ipPatternB;
                            if(pattern){
                                if(!utils.parseIP(ip, new RegExp(pattern, 'g')))
                                    return res.send({message: '非法IP：' + ip + ' [' + user._doc.config._doc.ipPattern + ']'});
                            }
                        }else
                            return res.send({message: '不支持的试卷获取模式：' + JSON.stringify(req.body)});
                    }

                    if(req.body.type == 'test') {
                        /** 如果是考试，标志已经获取试卷的标志，禁止多次答题 */
                        Exam.update({_id: req.params._id}, {
                            $set: {
                                isRead: true, readIP: ip, dateRead: new Date()
                            }
                        }).exec(function(err, result){
                            return res.json({data:user,success:true});
                        });
                    }else
                        return res.json({data:user,success:true});
                });
        })

        // 更新指定的考试试卷，仅用于学生交卷的动作
        .put(function (req, res) {
            //暂时不做权限处理
            //if(!ServerLogger.allowed('user','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});
            var autoCorrect = false;

            //opType操作类型，如果是correct，表示手动批卷或者是重新批卷的动作
            var opType = req.body.opType;

            Promise.resolve()
                .then(function(){
                    if(opType=='correct')
                        return Promise.resolve();
                    if (req.body.hasOwnProperty('ansSubmit')) {
                        return Promise.resolve();
                    }
                    return Promise.reject('没有可以提交的试卷数据');
                })
                .then(function(){
                    if(opType=='correct')
                        return Promise.resolve();
                    //第一步查询试卷是否需要自动判卷
                    return Exam.findById(req.params._id)
                        .select('tester config')
                        .populate('config', 'autoCorrect');
                })
                .then(function(data){
                    if(opType=='correct') {
                        autoCorrect = true;
                        return Exam.findById(req.params._id)
                            .populate('ansExpect.qid', 'point type');
                    }
                    //检查合法性
                    if(req.decoded._id==data.tester) {
                        autoCorrect = data.config.autoCorrect;
                        //if(autoCorrect)
                        //    //根据是否需要自动判卷，完成不同的检索任务
                        //    return Exam.findById(req.params._id)
                        //        .populate('ansExpect.qid', 'point type');
                        //else
                        //自动判卷可以直接在Exam中进行，无需关联
                        return Exam.findById(req.params._id);
                    }else
                        return Promise.reject('学生只能提交自己的试卷');
                })
                .then(function(exam){
                    if(opType != 'correct') {
                        //执行修改操作
                        exam.ansSubmit = req.body.ansSubmit;
                        exam.isSubmit = true;
                        exam.dateSubmit = new Date();
                        exam.submitIP = utils.getClientIP(req);
                    }

                    //是否需要自动判卷？
                    if(autoCorrect){
                        exam.score = exam.getScore();
                        exam.isCorrected = true;
                        exam.dateCorrect = new Date();
                    }

                    return exam.save();
                })
                .then(function(){
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    return res.json({success: true, message: Const.Msg.UpdateOK});
                })
                .catch(function(error){
                    return res.send('错误：' + JSON.stringify(error));
                });
        })

        //修改试卷的标志
        .post(function(req, res){
            Promise.resolve()
                .then(function(){
                    return Exam.update({_id:req.params._id},{$set:{
                        isCorrected:false, dateCorrect:null, score:0
                        ,isSubmit:false, dateSubmit:null
                        ,submitIP:null
                    }});
                })
                .then(function(data){
                    if(!data || data.ok!=1) //update 的返回{n:1, nModified:1, ok:1}
                        return Promise.reject('修改试卷的标志失败');
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    return res.json({success: true, message: Const.Msg.UpdateOK});
                })
                .catch(function(error){
                    return res.send('错误：' + JSON.stringify(error));
                });
        })

        // 删除指定用户
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Exam.remove({
                _id: req.params._id
            }, function (err, user) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params._id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        });

    //////////////导出试卷列表////////////////////
    apiRouter.route('/exportExams')
        .put(function(req, res){
            var criteria = req.body.filter;
            var user = req.body.user;

            // 学生允许导出个人试卷
            if(user.code != 'admin'){
                criteria.tester = user._id;
            }

            // 在数据库中匹配
            Exam.find(criteria, {dateSubmit:1, point:1, config:1,tester:1,isSubmit:1,score:1,_id:0})
                .populate('tester config', 'name code name isPublic dateBegin dateEnd')
                .exec(function(err, data) {
                    if (err) {
                        console.log('Error find: ', err);
                        res.json({success:false, message: 'Failed'});
                    } else {

                        // 进一步筛选数据，并拼接需要导出的数据字符串
                        var dataString = '序号\t考试名称\t学号\t姓名\t交卷状态\t交卷时间\t成绩\t总分\n';
                        var len = data.length;
                        for(var i = 0; i<len; i++){

                            // 考试是否公开，学生仅允许查看已公开的试卷
                            if(user.code != 'admin'){
                                if(data[i].config.isPublic == false)
                                    continue;
                            }

                            // 开始拼接
                            dataString += (i+1) + '\t' +
                                ((data[i].config)?data[i].config.name:'') + '\t' +
                                ((data[i].tester)?data[i].tester.code:'') + '\t' +
                                ((data[i].tester)?data[i].tester.name:'') + '\t' +
                                (data[i].isSubmit?'是':'否') + '\t' +
                                data[i].dateSubmit + '\t' +
                                data[i].score + '\t' +
                                data[i].point + '\n';
                        }

                        // 输出到文件，临时文件采用时间命名
                        var date = Date.now();
                        var path = config.exportDir + date + '.txt';
                        fs.writeFile(path, dataString, function(err){
                            if(err){
                                throw err;
                            }else {
                                res.json({success:true, data:{name: date}, message: 'OK'});
                            }
                        });
                    }
                });
        });

    //////////签到对象//////////
    apiRouter.route('/signgroups')
        //返回全部记录，一般用于关联
        .get(function(req, res){
            //默认使用名称的升序
            SignGroup.find({}).sort({name:1}).exec(function (err, data) {
                if (err) return res.send(err);
                res.json(data);
            });
        })

        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            //console.log('roles patch with criteria = ', criteria);
            SignGroup.count(criteria).exec(function (err, count) {
                if (err) return res.send(err);
                //console.log('get userCount : ', userCount);
                res.json({success:true, count:count});
            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {name:1};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                SignGroup.find(criteriaFilter).sort(criteriaSort).skip(skip).limit(pageSize).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            } else {
                //没有分页信息，直接返回所有数据记录
                SignGroup.find(criteriaFilter).sort(criteriaSort).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            }
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var user      = new SignGroup();
            user.name     = req.body.name;
            user.pattern     = req.body.pattern;
            if(req.body.hasOwnProperty('remark')) user.remark = req.body.remark;

            //console.log('ready to create a new supplier:', supplier);
            //console.log('pinyin of ', supplier.name, ' = ', Pinyin.getFullChars(supplier.name));
            user.save(function (err) {
                if (err) {
                    return res.send(err);
                }
                ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + user._id);
                res.json({success:true, message: Const.Msg.AddOK});
            });
        });

    ////////////////////////////////////////
    apiRouter.route('/signgroups/:_id')
        // 获取指定用户的信息
        .get(function (req, res) {
            SignGroup.findById(req.params._id, function (err, user) {
                if (err)
                    return res.send(err);
                res.json({data:user,success:true});
            });
        })

        /** 查询指定模式匹配的学生人数
         *  常见的匹配模式有：
         *  同专业若干个班级     ^(20155611)
         *  同年级若干个班级     ^(2015[5611|5511])
         *  不同年级的若干个班级  ^(20155611|20131608)
         */
        .patch(function (req, res) {
            if(req.body.pattern) {
                var criteria = {code:{$regex:req.body.pattern}};
                User.count(criteria).exec(function (err, count) {
                    if (err) return res.send(err);
                    res.json({success: true, count: count});
                });
            }else
                res.json({success: true, count: 0});
        })

        /** 查询指定模式匹配的学生对象ID数组 */
        .post(function (req, res) {
            if(req.body.pattern) {
                var criteria = {code:{$regex:req.body.pattern}};
                User.find(criteria).select('_id').exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json({success: true, data: data});
                });
            }else
                res.send({message: '没给定匹配模式'});
        })

        // 更新指定id用户信息
        .put(function (req, res) {
            //暂时不做权限处理
            //if(!ServerLogger.allowed('user','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            SignGroup.findById(req.params._id, function (err, user) {
                if (err) return res.send(err);
                if (req.body.name) user.name         = req.body.name;
                if (req.body.pattern) user.pattern   = req.body.pattern;
                if (req.body.hasOwnProperty('remark')) user.remark     = req.body.remark;

                user.save(function (err) {
                    //console.log('error = ',err);
                    if (err)
                        return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                    res.json({success:true, message: Const.Msg.UpdateOK});
                });

            });
        })

        // 删除指定用户
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            SignGroup.remove({
                _id: req.params._id
            }, function (err, user) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params._id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        });

    //////////签到//////////
    apiRouter.route('/signs')
        //返回全部记录，一般用于关联
        .get(function(req, res){
            //默认使用名称的升序
            Sign.find({}).sort({create:-1}).exec(function (err, data) {
                if (err) return res.send(err);
                res.json(data);
            });
        })

        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            //console.log('roles patch with criteria = ', criteria);
            Sign.count(criteria).exec(function (err, count) {
                if (err) return res.send(err);
                res.json({success:true, count:count});
            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('user','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                Sign.find(criteriaFilter,{name:1,owner:1,create:1,remark:1
                    ,signgroup:1,isClosed:1,numExpected:1,numReal:1,numException:1,history:1})
                    .populate('owner signgroup')
                    .sort(criteriaSort).skip(skip).limit(pageSize).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            } else {
                //没有分页信息，直接返回所有数据记录
                Sign.find(criteriaFilter,{name:1,owner:1,create:1,remark:1
                    ,signgroup:1,isClosed:1,numExpected:1,numReal:1,numException:1,history:1})
                    .sort(criteriaSort).exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
            }
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('user','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var user      = new Sign();
            user.name     = req.body.name;
            user.owner     = req.decoded._id;
            user.signgroup     = req.body.signgroup;
            if(req.body.hasOwnProperty('remark')) user.remark = req.body.remark;

            user.history = [];
            user.history.unshift({name:req.decoded._id, type: '发起'});

            //查询对象模式匹配的所有学生
            var criteria = {code:{$regex:req.body.pattern}};
            User.find(criteria, {_id:1}).exec(function (err, students) {
                if (err) return res.send(err);

                //并记录应到人数
                user.numExpected = students.length;

                user.detail = [];
                if(students.length>0)
                    //插入这些记录，初始化为未签到
                    for(var i in students){
                        user.detail.push({name:students[i]._id});
                    }

                //保存到数据库
                user.save(function (err) {
                    if (err) {
                        return res.send(err);
                    }
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + user._id);
                    res.json({success:true, message: Const.Msg.AddOK});
                });
            });
        });

    ////////////////////////////////////////////
    //////学生查询包含自己的签到信息
    ////////////////////////////////////////////
    apiRouter.route('/signstudent')
        .get(function (req, res) {
            var userId = req.decoded._id;
            var criteria = {'detail.name':userId};
            Sign.find(criteria,{
                name:1,create:1,owner:1,signgroup:1,isClosed:1,detail:1
            }).populate('owner signgroup')
                .exec(function (err, data) {
                    if (err) return res.send(err);

                    //转化签到数据到扁平数组，即将detail数组删除，并调取当前用户的数据保存到主文档中
                    var newData = [];
                    for(var i in data){
                        for(var j in data[i].detail){
                            if(data[i].detail[j].name == userId){
                                newData.push({
                                    _id:data[i]._id
                                    ,name:data[i].name
                                    ,create:data[i].create
                                    ,owner:data[i].owner
                                    ,signgroup:data[i].signgroup
                                    ,isClosed:data[i].isClosed

                                    ,status:data[i].detail[j].status
                                    ,date:data[i].detail[j].date
                                    ,remark:data[i].detail[j].remark
                                });
                                break;
                            }
                        }
                    }

                    res.json({data:newData,success:true});
                });
        });

    ////////////////////////////////////////
    apiRouter.route('/signs/:_id')
        .get(function (req, res) {
            var criteria = {_id:req.params._id};
            Sign.find(criteria).populate('signgroup detail.name')
                .exec(function (err, data) {
                    if (err) return res.send(err);
                    if (!data || data.length<1) return res.send('No data found');
                    res.json({data:data[0],success:true});
                });
        })

        /** 刷新本次签到的统计数据 */
        .patch(function(req,res){ //TODO
            Sign.findById(req.params._id, function (err, sign) {
                if (err) return res.send(err);

                //统计实际签到和异常个数
                //完成统计信息，不依赖从数据库中获取的统计信息，那里可能不准
                var numReal = 0;
                var numException = 0;
                for(var i in sign.detail){
                    if(sign.detail[i].status) {
                        if (sign.detail[i].status == '未签到') {
                        } else if (sign.detail[i].status == '已签到') {
                            numReal++;
                        } else {
                            console.log(numException, ' ', sign.detail[i].status);
                            numException++;
                        }
                    }
                }

                sign.numReal = numReal;
                sign.numException = numException;

                sign.save(function (err) {
                    if (err)  return res.send(err);
                    res.json({success:true, data:{numReal:numReal, numException:numException}});
                });
            });
        })

        // 更新指定id用户信息
        .put(function (req, res) {
            var userId = req.decoded._id;
            var type = req.body.type;
            if(type != 'status' && type != 'sign' && type != 'exception')
                return res.json({message:Const.Msg.NotSupported});
            //修改签到的状态仅仅admin有权限
            if((type == 'exception' || type == 'status') && 'admin' !== req.decoded.code)
                return res.json({message:Const.Msg.NotAuthenticated});

            /** 签到不提供修改界面，修改主要是
             * status 修改签到的状态，教师关闭一个签到或者重新开启一个签到
             * exception 修改某个学生的状态为指定状态，需要student和status两个状态值
             * sign     学生完成签到也是一种修改方式
             * 这里通过一个参数type来区别
             * */
            Sign.findById(req.params._id, function (err, user) {
                if (err) return res.send(err);
                var found = false;
                if (type=='exception') { //教师设置异常状态，标记学生为代签或者请假状态
                    var student = req.body.student;
                    var status = req.body.status;
                    var changeName = null;
                    for(var i in user.detail) {
                        //匹配传入的Detail的ID号
                        if (user.detail[i]._id == student) {
                            var oldStatus = user.detail[i].status;
                            if(oldStatus != status) {
                                changeName = "设定 id=" + student + " 的状态从 " + oldStatus + ' 到 ' + status;

                                user.detail[i].status = status;
                                //管理设定状态后，该用户的IP值为空
                                user.detail[i].ip = null;
                                user.detail[i].date = Date.now();
                                user.detail[i].remark = req.body.remark;
                                //仅仅标志有改动，不计算统计信息
                                user.numReal = -1;

                                user.history.unshift({name: userId, type: changeName});
                                found = true;
                                break;
                            }else{
                                return res.json({message:Const.Msg.NotSupported});
                            }
                        }
                    }
                }else if (type=='status'){ //教师设置签到状态，只有两种状态来回切换
                    var changeName;
                    if(user.isClosed) {
                        changeName = '重新开启';
                        user.isClosed = false;
                    }else{
                        changeName = '关闭';
                        user.isClosed = true;
                    }
                    user.history.unshift({name:userId, type: changeName});
                    found = true;
                }else if (type=='sign'){ //学生签到
                    //已经关闭的签到不能再添加签到学生。
                    if(user.isClosed)
                        return res.json({message:Const.Msg.NotSupported});

                    //查找这个学生的记录，修改其状态和当前时间
                    for(var i in user.detail){
                        //匹配当前用户的ID
                        if(user.detail[i].name == userId){
                            if(user.detail[i].status == '未签到') {
                                user.detail[i].date = Date.now();
                                user.detail[i].status = '已签到';

                                //记录签到时的IP地址
                                user.detail[i].ip = utils.getClientIP(req);

                                //仅仅标志有改动，不计算统计信息
                                user.numReal = -1;
                                found = true;
                                break;
                            }else{
                                return res.json({message: Const.Msg.NotSupported});
                            }
                        }
                    }
                }

                if(found)
                    user.save(function (err) {
                        //console.log('error = ',err);
                        if (err)
                            return res.send(err);
                        ServerLogger.log(req.decoded._id, req.path, req.method, req.body);
                        res.json({success:true, message: Const.Msg.UpdateOK});
                    });
                else
                    return res.json({message: '没有匹配到任何数据'});
            });
        })

        // 删除指定用户
        .delete(function (req, res) {
            //if(!ServerLogger.allowed('user','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Sign.remove({
                _id: req.params._id
            }, function (err, user) {
                if (err)
                    return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params._id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        });

    // 获取自身信息
    apiRouter.get('/me', function (req, res) {
        //console.log('get /me with decoded = ', req.decoded);
        res.send(req.decoded);
    });

    //////////roles/////////////////////////////
    apiRouter.route('/roles')
        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('role','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }
            //console.log('roles patch with criteria = ', criteria);
            Role.count(criteria)
                .exec(function (err, count) {
                    if (err) return res.send(err);
                    //console.log('get userCount : ', userCount);
                    res.json({success:true, count:count});
                });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('role','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {code:1};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip     = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;
                Role.find(criteriaFilter).sort(criteriaSort)
                    .skip(skip).limit(pageSize)
                    .exec(function (err, data) {
                        if (err) return res.send(err);
                        res.json(data);
                    });
            } else {
                //没有分页信息，直接返回所有数据记录
                Role.find(criteriaFilter).sort(criteriaSort)
                    .exec(function (err, data) {
                        if (err) return res.send(err);
                        res.json(data);
                    });
            }
        })

        //返回全部记录，一般用于关联
        .get(function(req, res){
            //默认使用名称的升序
            Role.find({}).sort({_p_name:1})
                .exec(function (err, data) {
                    if (err) return res.send(err);
                    res.json(data);
                });
        })

        //用来新增记录
        .post(function (req, res) {
            //if(!ServerLogger.allowed('role','create', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var role     = new Role();
            role.name    = req.body.name;
            role.code    = req.body.code;
            role.permits = req.body.permits;
            if(req.body.hasOwnProperty('remark'))
                role.remark = req.body.remark;

            //console.log('ready to create a new supplier:', supplier);
            //console.log('pinyin of ', supplier.name, ' = ', Pinyin.getFullChars(supplier.name));
            role.save(function (err) {
                if (err) {
                    if (err.code == 11000)
                        return res.json({message: Const.Msg.Duplicate});
                    else
                        return res.send(err);
                }
                ServerLogger.log(req.decoded._id, req.path, req.method, req.body, req.path + role._id);
                res.json({success:true, message: Const.Msg.AddOK});
            });
        });

    //////////role_id//////////////////////////////
    apiRouter.route('/roles/:role_id')
        .get(function (req, res) {
            Role.findById(req.params.role_id, function (err, role) {
                if (err) return res.send(err);
                res.json({data:role,success:true});
            });
        })

        .put(function (req, res) {
            //if(!ServerLogger.allowed('role','update', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Role.findById(req.params.role_id, function (err, role) {
                if (err) return res.send(err);
                if (req.body.name) role.name     = req.body.name;
                if (req.body.code) role.code     = req.body.code;
                if (req.body.hasOwnProperty('remark')) role.remark = req.body.remark;
                if (req.body.permits!=undefined
                    && req.body.permits!=null) role.permits = req.body.permits;
                var needUpdateUser = role.isModified('permits');
                role.save(function (err) {
                    if (err) return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, req.method, req.body);

                    //更新这个角色涉及的用户的权限值
                    //理想的地点是在模型的pre方法自动调用，但是那里User模型不能识别find,update方法
                    //只能在这里进行修改。
                    if(needUpdateUser){
                        //设置筛选用户的条件，仅对角色数组中包含了当前角色的
                        //目标格式： {role:ObjectId('5540c2bd1a7954c08eac655d')}
                        var criteria = {role:role._id};
                        var options = {multi:true, upsert:false};
                        //console.log('call update with criteria = ', criteria);
                        User.update(criteria, {$set:{__v:0}},options, function (err, numberAffected, raw) {
                                if (err) return res.send(err);
                                //console.log('The number of updated documents was %d', numberAffected);
                                //console.log('The raw response from Mongo was ', raw);
                                res.json({success:true, message: Const.Msg.UpdateOK});
                            });
                    }else
                        res.json({success:true, message: Const.Msg.UpdateOK});
                });

            });
        })

        .delete(function (req, res){
            //if(!ServerLogger.allowed('role','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //删除一个角色，只有在没有用户分配了这种角色的条件下才能删除，否则会出现数据库的不一致
            var criteria = {role:req.params.role_id};
            User.count(criteria).exec(function (err, count) {
                if(err)
                    res.send(err);
                else if (count==0) {
                    Role.remove({
                        _id: req.params.role_id
                    }, function (err, role) {
                        if (err) return res.send(err);
                        ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params.role_id});
                        res.json({success:true, message: Const.Msg.DelOK});
                    });
                }else
                    res.json({message: Const.Msg.DelRelatedObj});
            });
        });

    //////////files////////////////////////////////////////
    apiRouter.route('/files')
        //统计学生的上交作业情况
        .patch(function (req, res) {
            var beginDate = req.body.begin;
            var endDate = req.body.end;
            var pattern = req.body.pattern;

            //构造查询条件 {isFile:true, path:{$regex:'^./20138625'}, 'history.date':{$lt:ISODate("2016-03-08T00:00:00.000Z")}},{path:1,name:1,_id:0}
            var criteria = {isDelete:null, isFile:true, path:{$regex:'^./' + pattern}};

            //查询最后修改时间
            if(endDate)
                criteria['lastModified'] = {$lt:endDate};
            if(beginDate) {
                if(criteria['lastModified'])
                    criteria['lastModified']['$gt'] = beginDate;
                else
                    criteria['lastModified'] = {$gt: beginDate};

            }

            //先查询匹配的学生数，这是应收的学生名单
            var cri = {code:{$regex:pattern}};
            User.find(cri, {_id:1,name:1,code:1}).exec(function (err, students) {
                if (err) return res.send(err);

                if(students.length>0) {
                    var detail = {};
                    //为每个应到的学生建立一条记录，默认上交文件数为0
                    for (var i in students) {
                        detail[students[i]._id] = {num:0, info:students[i], file:[]};
                    }

                    //再执行查询
                    File.find(criteria)
                        .select('fname fullname history')
                        .sort({path:1,name:1})
                        //.populate('history.name', 'name code')
                        .exec(function (err, data) {
                            if (err) return res.send(err);

                            //按学生来统计总人数和文件数，并记录每个学生的学号和姓名，以及涉及的文件ID数组
                            //根据开始日期，删除哪些最新日期后于开始日期的文件
                            var numFile = 0;
                            var numStudent = 0;

                            var studentId;

                            var ip;
                            var uploadDate;

                            for(var i in data) {
                                //发现一个匹配的文件
                                numFile ++;
                                studentId = data[i].history[0].name;

                                ip = null;
                                uploadDate = null;
                                //从历史记录中找出上传动作的时间和IP，记录到响应文件中去
                                for(var j=0; j<data[i].history.length; j++){
                                    if(data[i].history[j].type=='upload'){
                                        ip = data[i].history[j].ip;
                                        uploadDate = data[i].history[j].date;
                                        break;
                                    }
                                }

								try{
									//记录已经提交文件的学生总数
									if(detail[studentId].num<1){
										numStudent ++;
									}
								}catch(exp){									
									console.log('detail = ', detail);
									console.log('data[',i,'] = ', data[i]);
									console.log('i = ',i);
									console.log('studentId = ', studentId);
									console.log('detail[studentId] = ', detail[studentId]);
									console.log(exp);
								}
                                //累加数量
                                detail[studentId].num ++;

                                //记录文件信息
                                detail[studentId].file.push({_id:data[i]._id, fname: data[i].fname, fullname: data[i].fullname, ip: ip, uploadDate: uploadDate});

                                /** 同时标记每个学生提交的文件中最新提交的文件索引，主要是为了在提交文档的学生中排序
                                 注意这里如果每个学生提交的文档超过一个，则最后提交时间将成为该生的提交时间，而
                                 排序则是按时间从前到后排序的。
                                 **/
                                if(detail[studentId].num>1){
                                    //先将记录的最新文件索引往后移动一位
                                    detail[studentId].lastIndex ++;
                                    //  存在多个文件，需要将新文件的时间和原来最新文件比较
                                    //  如果新发现的文件上传时间晚于记录的最新的文件上传时间，则以新发现的文件为准
                                    //  否则不变
                                    if(uploadDate>detail[studentId].file[detail[studentId].lastIndex].uploadDate)
                                        detail[studentId].lastIndex = 0;
                                }else{ //只有一个文件，则最新文件就是这一个
                                    detail[studentId].lastIndex = 0;
                                }
                            }

                            //构造返回的数据结构
                            var newDetail = [];
                            for(var i in detail){
                                newDetail.push(detail[i]);
                            }

                            var newData = {numStudent: numStudent, numFile: numFile, detail: newDetail};
                            res.json({success:true, data: newData});
                        });
                }else{
                    res.json({success:false, message:'没有找到匹配的学生[模式="' + pattern + '"]'});
                }

            });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //查询文件夹的条件一般是path，偶尔也有isFile属性，用于选择移动目的地时
            var criteria = {};
            if (req.body.criteriaFilter) {
                criteria = req.body.criteriaFilter;
            }else //默认查找根目录下的
                criteria = {path: '.', isDelete:0};
            //先要检查指定目录是否存在，防止通过导航历史访问不存在或已经改名的目录
            if(!criteria.path) 
                return res.json({message:'非法请求 : 当前路径path没有指定.'});
            //处理回收站数据请求
            if(criteria.path=='recycle'){
                var time1 = 'Thu Jan 01 1970 08:00:00 GMT+0800 (中国标准时间)';
                var time2 = 'Thu Jan 01 1970 08:00:10 GMT+0800 (中国标准时间)';
                File.find({isDelete:{$ne:time1}}).exec(function (err,result){
                    if(err)
                        return res.json({message:err});
                    var backRes = [];
                    //进一步筛选结果，过滤掉被删除的子文件
                    result.forEach(function (file){
                        if(file.isDelete != time2){
                            backRes.push(file);
                        }
                    });
                    res.json({data: backRes});
                });
            }else{
                //处理文件管理器数据请求
                async.waterfall([function(callback){
                        if(criteria.path.length>1){//根目录以外都要检查
                            var pos = criteria.path.lastIndexOf('/');
                            if(pos>-1){
                                var p = criteria.path.substring(0,pos);
                                var n = criteria.path.substring(pos+1);
                                File.find({path:p,name:n}).exec(function (err, data) {
                                    if (err) callback(err);
                                    if(data && data.length>0){
                                        callback(null);
                                    }else{
                                        callback('非法请求 : 指定路径' + criteria.path + '不存在，请检查是否已被删除、改名或移动，将自动转到网盘根目录 .');
                                    }
                                });
                            }
                        }else callback(null);
                    },
                    function(callback){
                        //排序条件是唯一的，先按目录文件排，然后按名称
                        var criteriaSort = {isFile:1,_p_name:1};
                        if(req.body.selectColumns)
                            File.find(criteria).sort(criteriaSort).select(req.body.selectColumns).exec(function (err, data) {
                                if (err) callback(err);
                                callback(null, data);
                            });
                        else
                            File.find(criteria).sort(criteriaSort).exec(function (err, data) {
                                if (err) callback(err);
                                callback(null, data);
                            });
                    }
                ], function (err, result) {
                    if(err) return res.json({message:err});
                    res.json({data:result});
                });
            }
        })

        //用来新增目录
        .post(function (req, res) {
            var fo       = new File();		// create a new instance of the User model
            fo.name      = req.body.name;  // set the users name (comes from the request)
            fo.path      = req.body.path;  // set the users username (comes from the request)
            fo.isFile    = req.body.isFile;
            fo.extension = req.body.extension;
            fo.history   = req.body.history;
            fo.save(function (err) {
                //console.log('create dir successfully');
                if (err) return res.send(err);
                res.json({_id:fo._id, success:true, message: Const.Msg.AddOK});
            });
        });

    //////////file_id////////////////////////////////////////
    apiRouter.route('/files/:file_id')
        //对应粘贴操作
        .patch(function (req, res) {
            var configFile = req.body.config;
            var id = req.params.file_id;
            File.find({path:configFile.dest,fullname:configFile.fullname}).exec(function (err, data) {
                if (err) return res.send(err);
                if(data && data.length>0){
                    //有重名的
                    if(configFile.isFile){
                        if(configFile.skip || configFile.skipOnce)
                            return res.json({success:true, message: 'skipped'});
                        if(configFile.overWrite || configFile.overWriteOnce){
                            //可以覆盖
                            if(configFile.isCut){
                                //覆盖剪切 = 删除重名文件，再修改当前文件的路径信息
                                if(config.uploadRemoveReplaced){
                                    //删除被覆盖文件
                                    File.findById(data[0]._id, function (err, file) {
                                        fs.unlink(config.uploadDir + file.fname, function(){
                                            File.remove({
                                                _id: data[0]._id
                                            }, function (err, file) {
                                                if (err) return res.send(err);
                                                //db.t4.update({id:5},{$push:{queue:{$each:[{wk:0,score:0}],$position:0}}});
                                                File.update({_id:id}, {$set:{path:configFile.dest},$push:{history:{$each:[{name:configFile.user,type:'move', date: Date.now()}],$position:0}}},options, function (err, numberAffected, raw) {
                                                    if (err) return res.send(err);
                                                    res.json({_id:id,success:true, message: Const.Msg.UpdateOK});
                                                });
                                            });
                                        });
                                    });
                                }else
                                    //保留被覆盖文件
                                    File.remove({
                                        _id: data[0]._id
                                    }, function (err, file) {
                                        if (err) return res.send(err);
                                        //db.t4.update({id:5},{$push:{queue:{$each:[{wk:0,score:0}],$position:0}}});
                                        File.update({_id:id}, {$set:{path:configFile.dest},$push:{history:{$each:[{name:configFile.user,type:'move', date: Date.now()}],$position:0}}},options, function (err, numberAffected, raw) {
                                            if (err) return res.send(err);
                                            res.json({_id:id,success:true, message: Const.Msg.UpdateOK});
                                        });
                                    });
                            }else{
                                //覆盖复制 = 删除原有真实文件，复制现在的真实文件，修改重名文件的fname和size属性
                                File.findById(id, function (err, file) {
                                    if (err) return res.send(err);
                                    if(config.uploadRemoveReplaced) {
                                        //删除被覆盖文件
                                        fs.unlink(config.uploadDir + data[0].fname, function () {
                                            var neuName = utils.generateNewName(file.fullname);
                                            //复制实体文件
                                            utils.copyFile(config.uploadDir + file.fname, config.uploadDir + neuName);
                                            File.update({_id: data[0]._id}, {
                                                $set: {fname: neuName, size: file.size},
                                                $push: {
                                                    history: {
                                                        $each: [{name: configFile.user, type: 'copy', date: Date.now()}],
                                                        $position: 0
                                                    }
                                                }
                                            }, options, function (err, numberAffected, raw) {
                                                if (err) return res.send(err);
                                                res.json({
                                                    _id: data[0]._id,
                                                    success: true,
                                                    message: Const.Msg.UpdateOK
                                                });
                                            });
                                        });
                                    }else{
                                        //保留被覆盖文件，直接产生新文件
                                        var neuName = utils.generateNewName(file.fullname);
                                        //复制实体文件
                                        utils.copyFile(config.uploadDir + file.fname, config.uploadDir + neuName);
                                        File.update({_id: data[0]._id}, {$set: {fname: neuName, size: file.size},$push:{history:{$each:[{name:configFile.user,type:'paste', date: Date.now()}],$position:0}}}, options, function (err, numberAffected, raw) {
                                            if (err) return res.send(err);
                                            res.json({_id: data[0]._id, success: true, message: Const.Msg.UpdateOK});
                                        });
                                    }
                                });
                            }
                        }else if(configFile.isBackup || configFile.needRename || configFile.needRenameOnce){
                            //允许改名
                            //用Async来组织改名不重复的效果
                            var foundUniqueName = false;
                            var neuFullName     = '';
                            var stamName        = data[0].name;
                            var neuName         = stamName;
                            var extension       = data[0].extension;
                            var uniqueSuffix    = ' - 备份';
                            var nameIndex       = 1;
                            //console.log('enter whilst to find a unique name based on ', (neuName+ '.'+ extension));
                            async.whilst(
                                function() { return !foundUniqueName; },
                                function(cb) {
                                    //不断的添加不重复后缀来避免重名
                                    neuName = stamName + uniqueSuffix;
                                    if(nameIndex>1){
                                        neuName += '(' + nameIndex + ')';
                                    }
                                    neuFullName = neuName + '.' + extension;
                                    //console.log('check whether ', neuFullName, ' under path ',configFile.dest,' is duplicated?');
                                    File.find({path:configFile.dest,fullname:neuFullName}).exec(function (err, data) {
                                        if (err) cb('MongoDB error ' + err);
                                        if (data && data.length > 0) {
                                            //有重名的
                                            //console.log('repeat whilst = ' + neuName + ', ' + neuFullName);
                                            nameIndex ++;
                                            cb();
                                        }else {
                                            foundUniqueName = true;
                                            cb('found unique name = ' + neuName + ', ' + neuFullName);
                                        }
                                    });
                                },
                                function(err) {
                                    //console.log('Exist whilst or error = ', err);
                                    //找到不重名的文件，完成文件的粘贴工作
                                    if(configFile.isCut){
                                        //修改
                                        var options = {multi:false, upsert:false};
                                        File.update({_id:id}, {$set:{path:configFile.dest,name:neuName},$push:{history:{$each:[{name:configFile.user,type:'paste', date: Date.now()}],$position:0}}},options, function (err, numberAffected, raw) {
                                            if (err) return res.send(err);
                                            res.json({_id:id,success:true, message: Const.Msg.UpdateOK});
                                        });
                                    }else{
                                        //复制，先找出原始文件，复制其真实文件(注意新命名)，然后保存一条新纪录
                                        File.findById(id, function (err, file) {
                                            if (err) cb('MongoDB error ' + err);
                                            var neuName2 = utils.generateNewName(neuFullName);
                                            //复制实体文件
                                            utils.copyFile(config.uploadDir + file.fname, config.uploadDir + neuName2);
                                            //保存数据库记录
                                            var f       = new File();
                                            f.name      = neuName;
                                            f.fname     = neuName2;
                                            f.extension = file.extension;
                                            f.mimetype  = file.mimetype;
                                            f.size      = file.size;
                                            f.path      = configFile.dest;
                                            f.encoding  = file.encoding;
                                            f.history   = [{name:configFile.user, type:'paste'}];
                                            f.save(function (err) {
                                                if (err) cb('MongoDB error ' + err);
                                                else res.json({_id: f._id,success:true, message: Const.Msg.UpdateOK});
                                            });
                                        });
                                    }
                                }
                            );
                        }else{
                            //需要返回给用户来决定如何处理重名
                            res.json({success:false, message: Const.Msg.Duplicate});
                        }
                    }else{
                        //目录重名是允许的，重名文件即合并两个文件夹的内容，除非是当前目录复制粘贴，这样会自动生成一个备份目录
                        // 主要有三个操作，用Async来同步：
                        // 1. 找出这个目录的Path和Fullname两项信息，
                        // 2. 收集所有path=Path+Fullname的文件信息，这是需要传回的信息
                        // 3. 如果是剪切操作，还需要删除原有目录
                        var newId = data[0]._id;
                        var neuName = null;
                        async.waterfall([
                            function(callback) {
                                //是否需要重命名
                                if(configFile.isBackup){
                                    //为目录找出不重复的目录名称，新增目录
                                    var foundUniqueName = false;
                                    var stamName        = data[0].name;
                                    neuName             = stamName;
                                    var uniqueSuffix    = ' - 备份';
                                    var nameIndex       = 1;
                                    async.whilst(
                                        //找出不重复名称的过程
                                        function() { return !foundUniqueName; },
                                        function(cb) {
                                            //不断的添加不重复后缀来避免重名
                                            neuName = stamName + uniqueSuffix;
                                            if(nameIndex>1){
                                                neuName += '(' + nameIndex + ')';
                                            }
                                            File.find({path:configFile.dest,name:neuName,isFile:false}).exec(function (err, dataDuplicated) {
                                                if (err) cb('MongoDB error ' + err);
                                                else if (dataDuplicated && dataDuplicated.length > 0) {
                                                    //有重名的
                                                    nameIndex ++;
                                                    cb();
                                                }else {
                                                    foundUniqueName = true;
                                                    cb('found unique name = ' + neuName);
                                                }
                                            });
                                        },
                                        function(err) {
                                            //找到不重名的目录名称，完成目录的粘贴工作
                                            //这里必定是复制，剪切不可能发生在当前目录，先找出原始目录信息，复制信息，然后保存一条新纪录
                                            File.findById(id, function (err, file) {
                                                if (err) callback('MongoDB error ' + err);
                                                else {
                                                    //保存数据库记录
                                                    var f       = new File();
                                                    f.name      = neuName;
                                                    f.extension = file.extension;
                                                    f.isFile    = false;
                                                    f.path      = configFile.dest;
                                                    f.history   = [{name: configFile.user, type: 'create'}];
                                                    f.save(function (err) {
                                                        if (err) callback('MongoDB error ' + err);
                                                        else{
                                                            newId = f._id;
                                                            callback(null);
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    );
                                }else
                                    callback(null);
                            },
                            function(callback) {
                                //找出原始目录的路径和名称
                                File.find({_id: id}).select('path name').exec(function (err, dataLocateDir) {
                                    if (err) callback('MongoDB error ' + err);
                                    else if (!dataLocateDir || dataLocateDir.length<1){ callback('MongoDB error no matched found ' + id);}
                                    else callback(null, dataLocateDir[0].path, dataLocateDir[0].name);
                                });
                            },
                            function(path, name, callback) {
                                //收集原始目录下的文件和子目录信息
                                if(!neuName)
                                    //如果目录没有重命名，就使用原来的名称
                                    neuName = name;
                                File.find({path: path + '/' + name}).select('path fullname isFile').exec(function (err, data) {
                                    if (err) callback('MongoDB error ' + err);
                                    else callback(null, data);
                                });
                            },
                            function(data, callback) {
                                //目录剪切重名时，删除原来的目录
                                if(configFile.isCut){
                                    File.remove({_id: id}, function (err, file) {
                                        if (err) callback('MongoDB error ' + err);
                                        else callback(null, data);
                                    });
                                }else
                                    callback(null, data);
                            }
                        ], function (err, data) {
                            if(err) return res.send(err);
                            res.json({_id:newId, neuDest:configFile.dest + '/' + neuName, data:data,success:true, message: Const.Msg.UpdateOK});
                        });
                    }
                }else{
                    //不重名，执行粘贴动作
                    if(configFile.isFile) {
                        if (configFile.isCut) {
                            //剪切只需要修改数据库信息即可，没有文件操作
                            var criteria = {_id: id};
                            var options = {multi: false, upsert: false};
                            File.update(criteria, {
                                $set: {path: configFile.dest},
                                $push: {history: {$each: [{name: configFile.user, type: 'cut', date: Date.now()}], $position: 0}}
                            }, options, function (err, numberAffected, raw) {
                                if (err) return res.send(err);
                                res.json({_id: id, success: true, message: Const.Msg.UpdateOK});
                            });
                        } else {
                            //复制，先找出原始文件，复制其真实文件(注意新命名)，然后保存一条新纪录
                            File.findById(id, function (err, file) {
                                if (err) return res.send(err);
                                var neuName = utils.generateNewName(file.fullname);
                                //复制实体文件
                                utils.copyFile(config.uploadDir + file.fname, config.uploadDir + neuName);
                                //保存数据库记录
                                var f       = new File();
                                f.name      = file.name;
                                f.fname     = neuName;
                                f.extension = file.extension;
                                f.mimetype  = file.mimetype;
                                f.size      = file.size;
                                f.path      = configFile.dest;
                                f.encoding  = file.encoding;
                                f.history   = [{name: configFile.user, type: 'paste'}];
                                f.save(function (err) {
                                    if (err) res.send(err);
                                    else res.json({_id: f._id, success: true, message: Const.Msg.UpdateOK});
                                });
                            });
                        }
                    }else{
                        //文件夹粘贴，没有重名
                        //三个步骤，先获取这个文件夹的path和name，再查询文件夹包含的直接文件和文件夹，最后修改这个条目信息
                        var neuName = null;
                        async.waterfall([
                            function(callback) {
                                //定位这个条目
                                File.find({_id: id}).select('path name').exec(function (err, dataDir) {
                                    if (err) callback('MongoDB error ' + err);
                                    else if (!dataDir || dataDir.length<1){ callback('MongoDB error no matched found ' + id);}
                                    else {
                                        //console.log('locate folder ', dataDir);
                                        callback(null, dataDir[0].path, dataDir[0].name);
                                    }
                                });
                            },
                            function(path, name, callback) {
                                //查找其下的文件和文件夹
                                neuName = name;
                                File.find({path: path + '/' + name}).select('path fullname isFile').exec(function (err, data) {
                                    if (err) callback('MongoDB error ' + err);
                                    else callback(null, data);
                                });
                            },
                            function(data, callback) {
                                //修改条目信息
                                if (configFile.isCut) {
                                    //剪切目录只需要修改数据库信息即可
                                    var criteria = {_id: id};
                                    var options = {multi: false, upsert: false};
                                    File.update(criteria, {
                                        $set: {path: configFile.dest},
                                        $push: {history: {$each: [{name: configFile.user, type: 'cut', date: Date.now()}], $position: 0}}
                                    }, options, function (err, numberAffected, raw) {
                                        if (err) callback('MongoDB error ' + err);
                                        else callback(null, data, id);
                                    });
                                } else {
                                    //复制目录，仅需按原始目录保存一条新纪录，修改path属性
                                    File.findById(id, function (err, file) {
                                        if (err){ callback('MongoDB error ' + err);}
                                        else {
                                            //保存数据库记录
                                            var f       = new File();
                                            f.name      = file.name;
                                            f.fname     = file.fname;
                                            f.extension = file.extension;
                                            f.mimetype  = file.mimetype;
                                            f.size      = file.size;                                            
                                            f.path      = configFile.dest;
                                            f.encoding  = file.encoding;
                                            f.history   = [{name: configFile.user, type: 'paste'}];
                                            f.isFile    = false;
                                            f.save(function (err) {
                                                if (err) callback('MongoDB error ' + err);
                                                else callback(null, data, f._id);
                                            });
                                        }
                                    });
                                }
                            }
                        ], function (err, data, id) {
                            if(err) return res.send(err);
                            res.json({_id:id, neuDest:configFile.dest + '/' + neuName, data:data,success:true, message: Const.Msg.UpdateOK});
                        });
                    }
                }
            });
        })

        .put(function (req, res) {
            File.findById(req.params.file_id, function (err, file) {
                if (err) return res.send(err);
                if (req.body.name) file.name = req.body.name;
                if (req.body.history) file.history.unshift(req.body.history);
                file.save(function (err) {
                    if (err) return res.send(err);
                    res.json({success:true, message: Const.Msg.UpdateOK});
                });
            });
        })

        //文件删除
        .delete(function (req, res){
            var id = req.params.file_id;
            File.findById(id, function (err, file) {
                if(err || !file){
                    res.send(err);
                }else {
                    if (file.isDelete == 'Thu Jan 01 1970 08:00:00 GMT+0800 (中国标准时间)') {
                        File.update({_id: id}, {isDelete: Date.now()}, function (err, numAffected) {
                            if (err)
                                return res.send(err);
                            res.json({success: true, message: Const.Msg.DelOK});
                        });
                    } else {
                        File.remove({_id: id}, function (err, numAffected) {
                            if (err)
                                return res.send(err);
                            res.json({success: true, message: Const.Msg.DelOK});
                        });
                    }

                    // fs.unlink(config.uploadDir + file.fname, function(){
                    //     File.remove({
                    //         _id: id
                    //     }, function (err, numAffected) {
                    //         if (err) return res.send(err);
                    //         res.json({success:true, message: Const.Msg.DelOK});
                    //     });
                    // });
                }
            });
        });

    //////////folder////////////////////////////////////////
    /**
     * 删除目录时还需要删除目录下所含的文件和子目录，这个过程通过路径匹配来实现
     * 例如：要删除./aaa目录，则所有path以./aaa开始的条目（不管是文件还是目录）
     * 都必须删除，转化成Mongoose的删除条件即为：
     * {'$or':[{path:'./ccc/bbbb'},{path:{$regex:'^(./ccc/bbbb/)'}}]}
     */
    apiRouter.route('/folder/')
        .patch(function(req,res){
            //先删除子目录和文件
            var config = req.body;
            var path = config.path;
            //var pathReg = path.replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
            var criteria = {'$or':[{path:path},{path:{$regex:'^('+ path + '/)'}}]};
            // File.find(criteria,function(err,data){
            //     console.log(data);
            // });
            if(config.rdelete){
                File.remove(criteria, function (err, file) {
                    if (err) return res.send(err);
                    //再删除目录本身
                    File.remove({_id: config.id}, function (err, file) {
                        if (err) return res.send(err);
                        res.json({success: true, message: Const.Msg.DelOK});
                    });
                });
            }else{
                //删除目录时，目录标记为删除时间，子文件和子目录标记为初始时间后十秒
                File.update(criteria, {isDelete: new Date(10000)}, function (err, file) {
                    if (err) return res.send(err);
                    //再删除目录本身
                    File.update({_id: config.id}, {isDelete: Date.now()}, function (err, file) {
                        if (err) return res.send(err);
                        res.json({success: true, message: Const.Msg.DelOK});
                    });
                });
            }
        })

        //目录改名引起的子目录和子文件的路径改变
        //注意目录的改名并不是在这里进行的，而是通过File.update方法进行的
        //这里没有采用串行化，而是直接用并行的方法来触发批量修改的动作，可能会造成误差？
        .put(function(req,res){
            //分成两个步骤：1.直接子目录和文件夹精确path匹配来改名
            var config = req.body;
            var options = {multi:true, upsert:false};
            File.update({path:config.path + '/' + config.oldName}, {$set:{path:config.path + '/' + config.newName}}, options, function(error){
                if(error) return res.send(error);
            });
            //2.递归目录下的通过正则匹配来改名
            var oldPath = config.path + '/' + config.oldName + '/';
            var pathReg = oldPath.replace(/([*+-.?^${}()|[\]\/\\])/g, '\\$1');
            var criteria = {path:{$regex:'^('+ pathReg + ')'}};
            File.find(criteria).select('_id path').exec(function (err, data) {
                //由于不能批量修改，第一步先找到这些记录
                if (err) return res.send(err);
                if(data && data.length>0) {
                    var oldLength = oldPath.length;
                    var stamPath = config.path + '/' + config.newName + '/';
                    for(var i= 0,len= data.length; i<len; i++){
                        var newPath = stamPath + data[i].path.substring(oldLength);
                        //console.log('update path from ', data[i].path, ' to ', newPath);
                        File.update({_id:data[i]._id}, {$set:{path:newPath}}, {multi:false, upsert:false}, function(error){
                            if(error) return res.send(error);
                        });
                    }
                }
                res.json({success:true});
            });
        });

    ////////////Question Images//////////////////////////////////////////////
    apiRouter.route('/questionimages/')
        //查询工作目录是否存在，如果不存在则立即新增
        .patch(function(req,res){
            var dir = req.body.code;
            Promise.resolve()
                .then(function(){
                    return File.find({path:'.',name:dir});
                })
                .then(function(data){
                    if(!data || data.length<1){
                        //不存在，则新建一个
                        var fo       = new File();
                        fo.name      = dir;
                        fo.path      = '.';
                        fo.isFile    = false;
                        fo.extension = 'folder';
                        fo.history   = [{name:req.decoded._id,type:'create'}];
                        return fo.save();
                    }
                    return Promise.resolve();
                })
                .then(function(){
                    res.json({success:true});
                })
                .catch(function(error){
                    res.send(error);
                })
            ;
        })

        //查询指定目录下的所有子目录和图片列表
        .put(function(req,res){
            var dir = req.body.dir;
            Promise.resolve()
                .then(function(){
                    /** 构造查询条件
                     * 1.   必须在制定目录中， path属性必须等于给定目录名称
                     * 2.   或者是文件夹
                     *          是文件     且扩展名是jpg|png|jpeg|bmp|gif|tiff的一个
                     *                      扩展名必须跟前段控制器的questionCtrl的questionEditController的
                     *                      文件选择筛选器保持一致
                     */
                    var cr = {path:dir};
                    var reg = 'jpg|png|jpeg|bmp|gif|tiff';
                    cr['$or'] = [{isFile:false},{isDelete:null}
                        ,{isFile:true,extension:{'$regex':reg}}];
                    return File.find(cr).select('path name extension fname isFile');
                })
                .then(function(data){
                    res.json({success:true, data:data});
                })
                .catch(function(error){
                    res.send(JSON.stringify(error));
                })
            ;
        })
    ;

    //////////logs////////////////////////////////////////
    apiRouter.route('/logs')
        //允许管理员清空一个表的所有数据，一般是导入数据前的清理工作
        .delete(function (req, res) {
            if(!req.decoded){
                res.json({message:Const.Msg.Token.Invalid});
            }else{
                //if(!ServerLogger.allowed('log','clear', req.decoded)){
                //        res.json({message:Const.Msg.Token.NotAllowed});
                //}else {
                //    Log.remove({}, function (err) {
                //        if (err) return res.send(err);
                //        ServerLogger.log(req.decoded.id, req.path, 'clear', null);
                //        res.json({success:true, message: Const.Msg.DelOK});
                //    });
                //}

                Log.remove({}, function (err) {
                    if (err) return res.send(err);
                    ServerLogger.log(req.decoded._id, req.path, 'clear', null);
                    res.json({success:true, message: Const.Msg.DelOK});
                });
            }
        })

        //用来查询满足指定条件下记录条数
        .patch(function (req, res) {
            //if(!ServerLogger.allowed('log','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            var criteria = {};
            if(req.body.criteria){
                criteria = req.body.criteria;
            }

            Log.count(criteria)
                .exec(function (err, count) {
                    if (err) return res.send(err);
                    //console.log('get userCount : ', userCount);
                    res.json({success:true, count:count});
                });
        })

        //用来按页查询数据集合
        .put(function (req, res) {
            //if(!ServerLogger.allowed('log','view', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            //查询数据集合，这里都是按页来查询，所以需要考虑四个参数
            // currentPage，pageSize，criteriaFilter，criteriaSort
            //默认参数设置
            var criteriaFilter = {};
            if(req.body.criteriaFilter){
                criteriaFilter = req.body.criteriaFilter;
            }

            var criteriaSort = {code:1};
            if (req.body.criteriaSort) {
                criteriaSort = req.body.criteriaSort;
            }

            if (req.body.currentPage && req.body.pageSize) {
                var skip = req.body.currentPage;
                var pageSize = req.body.pageSize;
                //计算需要需要跳过的文档数量
                skip = (skip - 1) * pageSize;

                Log.find(criteriaFilter).sort(criteriaSort)
                    .skip(skip).limit(pageSize)
                    .populate('user')
                    .exec(function (err, data) {
                        if (err) return res.send(err);
                        res.json(data);
                    });
            } else {
                //没有分页信息，直接返回所有数据记录
                Log.find(criteriaFilter).sort(criteriaSort)
                    .exec(function (err, data) {
                        if (err) return res.send(err);
                        res.json(data);
                    });
            }
        });

    //////////log_id////////////////////////////////////////
    apiRouter.route('/logs/:log_id')
        .delete(function (req, res){
            //if(!ServerLogger.allowed('log','delete', req.decoded))
            //    return res.json({message:Const.Msg.NotAuthenticated});

            Log.remove({
                _id: req.params.log_id
            }, function (err, log) {
                if (err) return res.send(err);
                ServerLogger.log(req.decoded._id, req.path, req.method, {_id: req.params.log_id});
                res.json({success:true, message: Const.Msg.DelOK});
            });
        });

    // 返回这个路由流程，作为对象供其它函数来使用
    return apiRouter;
};