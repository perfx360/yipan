// 使用模块和服务的名称
angular.module('userApp', ['ngAnimate', 'app.routes'
    , 'authService', 'loginCtrl'
    , 'homeCtrl'
    , 'roleCtrl'
    , 'userCtrl'
    , 'signGroupCtrl'
    , 'signCtrl'
    , 'qcategoryCtrl'
    , 'questionCtrl'
    , 'sheetCtrl'
    , 'checkCtrl'
    , 'examconfigCtrl'
    , 'examCtrl'
    , 'logCtrl'
    , 'baseService'
    , 'pageService'
    , 'arrayService'
    , 'permissionService'
    , 'pCodeService'
    , 'mgcrea.ngStrap'
    , 'fileCtrl'
    , 'angularFileUpload'
    , 'contextService'
    , 'utilsService'
])

    // application configuration to integrate token into requests
    .config(['$httpProvider',function ($httpProvider) {
        // 添加认证到http请求
        $httpProvider.interceptors.push('AuthInterceptor');
    }])

    //下拉列表框的默认属性设置
    .config(function($selectProvider) {
        angular.extend($selectProvider.defaults, {
            animation: 'am-flip-x',
            sort: true,
            allNoneButtons: true,
            allText: '全选',
            noneText: '不选'
        });
    });