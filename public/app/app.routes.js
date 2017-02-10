'use strict';

// angular的路由方式
angular.module('app.routes', ['ngRoute'])

    .config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {

        $routeProvider

            .when('/filestat',{
                templateUrl: 'public/app/components/files/stat.html',
                controller: 'fileStatController',
                controllerAs: 'ctrl'
            })

            .when('/files',{
                templateUrl: 'public/app/components/files/all.html',
                controller: 'fileController',
                controllerAs: 'ctrl'
            })

            .when('/files/uploader',{
                templateUrl: 'public/app/components/files/uploader.html',
                controller: 'uploaderController',
                controllerAs: 'ctrl'
            })

            .when('/files/recycle',{
                templateUrl: 'public/app/components/files/recycle.html',
                controller: 'recycleController',
                controllerAs: 'ctrl'
            })

            .when('/files/video',{
                templateUrl: 'public/app/components/files/video.html',
                controller: 'videoController',
                controllerAs: 'ctrl'
            })

            // route for the home page
            // 主页
            .when('/', {
                templateUrl: 'public/app/shared/home.html',
                controller: 'homeController',
                controllerAs: 'ctrl'
            })

            .when('/register', {
                templateUrl: 'public/app/shared/register.html'
            })

            // login page
            // 逻辑页面，需要指定模板位置、控制器定义、控制器在模板中的别名
            .when('/login', {
                templateUrl: 'public/app/shared/login.html',
                controller: 'loginController',
                controllerAs: 'login'
            })

            ////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////

            ////试题类属表
            .when('/qcategorys', {
                templateUrl: 'public/app/components/qcategorys/all.html',
                controller: 'qcategoryController',
                controllerAs: 'ctrl'
            })

            .when('/qcategorys/:_id', {
                templateUrl: 'public/app/components/qcategorys/single.html',
                controller: 'qcategoryEditController',
                controllerAs: 'ctrl'
            })

            ////试题表
            .when('/questions', {
                templateUrl: 'public/app/components/questions/all.html',
                controller: 'questionController',
                controllerAs: 'ctrl'
            })

            .when('/questions/:_id', {
                templateUrl: 'public/app/components/questions/single.html',
                controller: 'questionEditController',
                controllerAs: 'ctrl'
            })

            // 批量导入用户的窗口
            .when('/questionsimport', {
                templateUrl: 'public/app/components/questions/import.html',
                controller: 'questionImportController',
                controllerAs: 'ctrl'
            })

            ////试卷表
            .when('/sheets', {
                templateUrl: 'public/app/components/sheets/all.html',
                controller: 'sheetController',
                controllerAs: 'ctrl'
            })

            .when('/sheets/:_id', {
                templateUrl: 'public/app/components/sheets/single.html',
                controller: 'sheetEditController',
                controllerAs: 'ctrl'
            })

            ////考试表
            .when('/examconfigs', {
                templateUrl: 'public/app/components/examconfigs/all.html',
                controller: 'examconfigController',
                controllerAs: 'ctrl'
            })

            .when('/examconfigs/:_id', {
                templateUrl: 'public/app/components/examconfigs/single.html',
                controller: 'examconfigEditController',
                controllerAs: 'ctrl'
            })

            ////考试试卷表
            .when('/exams', {
                templateUrl: 'public/app/components/exams/all.html',
                controller: 'examController',
                controllerAs: 'ctrl'
            })

            .when('/exams/:_id', {
                templateUrl: 'public/app/components/exams/single.html',
                controller: 'examEditController',
                controllerAs: 'ctrl'
            })

            ////角色表
            .when('/roles', {
                templateUrl: 'public/app/components/roles/all.html',
                controller: 'roleController',
                controllerAs: 'ctrl'
            })

            .when('/roles/create', {
                templateUrl: 'public/app/components/roles/single.html',
                controller: 'roleCreateController',
                controllerAs: 'ctrl'
            })

            .when('/roles/:role_id', {
                templateUrl: 'public/app/components/roles/single.html',
                controller: 'roleEditController',
                controllerAs: 'ctrl'
            })

            ////////////////////////////////////////////////////////////////
            //////////////////////////////////////////////////////////////
            // 用户表
            // show all users
            // 显示所有用户的页面
            .when('/users', {
                templateUrl: 'public/app/components/users/all.html',
                controller: 'userController',
                controllerAs: 'ctrl'
            })

            // 批量导入用户的窗口
            .when('/users/import', {
                templateUrl: 'public/app/components/users/import.html',
                controller: 'userImportController',
                controllerAs: 'ctrl'
            })

            // form to create a new user
            // same view as edit page
            // 增加页面，与修改页面一致的模板，只是控制器定义不同，别名都一样
            // .when('/users/create', {
            //     templateUrl: 'public/app/components/users/single.html',
            //     controller: 'userEditController',
            //     controllerAs: 'ctrl'
            // })

            // page to edit a user
            // 修改页面
            .when('/users/:user_id', {
                templateUrl: 'public/app/components/users/single.html',
                controller: 'userEditController',
                controllerAs: 'ctrl'
            })

            // page to edit me
            // 修改个人信息页面
            // .when('/users/me', {
            //     templateUrl: 'public/app/components/users/single.html',
            //     controller: 'userEditController',
            //     controllerAs: 'ctrl'
            // })
            //////////////////////////////////////////////////////////////
            // 抽查表
            // 显示所有抽查的页面
            .when('/checks', {
                templateUrl: 'public/app/components/checks/all.html',
                controller: 'checkController',
                controllerAs: 'ctrl'
            })

            // 查看抽查明细
            .when('/checks/:check_id', {
                templateUrl: 'public/app/components/checks/single.html',
                controller: 'checkEditController',
                controllerAs: 'ctrl'
            })

            //////////////////////////////////////////////////////////////
            // 签到表
            // 显示所有签到的页面
            .when('/signs', {
                templateUrl: 'public/app/components/signs/all.html',
                controller: 'signController',
                controllerAs: 'ctrl'
            })

            .when('/signstudent', {
                templateUrl: 'public/app/components/signs/student.html',
                controller: 'signStudentController',
                controllerAs: 'ctrl'
            })

            // 新增、修改签到
            .when('/signs/:_id', {
                templateUrl: 'public/app/components/signs/single.html',
                controller: 'signEditController',
                controllerAs: 'ctrl'
            })

            // 签到对象表
            // 显示所有签到对象的页面
            .when('/signgroups', {
                templateUrl: 'public/app/components/signgroups/all.html',
                controller: 'signGroupController',
                controllerAs: 'ctrl'
            })

            // 新增、修改签到对象
            .when('/signgroups/:_id', {
                templateUrl: 'public/app/components/signgroups/single.html',
                controller: 'signGroupEditController',
                controllerAs: 'ctrl'
            })

            // 日志列表信息页面
            .when('/logs', {
                templateUrl: 'public/app/components/logs/all.html',
                controller: 'logController',
                controllerAs: 'ctrl'
            })

            //错误处理页面
            .otherwise({
                templateUrl: 'public/app/shared/error404.html'
            })
        ;



        // 拒绝传统的 http://example.com/#/about 地址，而是采用Html5模式来显示
        // 并形成浏览历史信息
        $locationProvider.html5Mode(true);

    }]);
