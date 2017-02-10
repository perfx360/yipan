// 用户认证服务
angular.module('authService', ['permissionService'])
    // 提供一个Auth的工厂对象，需要注入http,q,AuthToken三个对象
    .factory('Auth', ['$http', '$q', 'AuthToken', 'Permission', function ($http, $q, AuthToken, Permission) {
        var authFactory = {};

        // 登陆功能
        authFactory.login = function (username, password) {

            // 执行一个API
            return $http.post('/api/authenticate', {
                code: username,
                pwd: password
            }).success(function (data) {
                // 如果成功，将标记保存到前端页面里面
                AuthToken.setToken(data.token);
                return data;
            });
        };

        // 登出功能
        authFactory.logout = function () {
            //清除token
            AuthToken.setToken();
        };

        // 检查是否登陆的标志，这里通过检查一个token的本地变量来判别是否登陆了
        authFactory.isLoggedIn = function () {
            if (AuthToken.getToken())
                return true;
            else
                return false;
        };

        //设置当前用户的权限数值
        authFactory.setPermission = function(permitString){
            Permission.init(permitString);
            authFactory.permission = Permission.permits;
        };

        //设置当前用户的信息
        authFactory.setUser = function(user){
            authFactory.user = user;
            authFactory.setPermission(user.permits);
        };

        // 从当前的Auth对象中获得当前登陆用户，用于每个页面的初始化过程
        authFactory.readUser = function () {
            if (AuthToken.getToken()) {
                return authFactory.user;
            }
            return undefined;
        };

        // 通过请求获得当前登陆用户信息，用于修改个人信息
        authFactory.getUser = function () {
            if (AuthToken.getToken()) {
                // TODO cache：true的设置据说可以让getUser方法驻留在cache里面
                // 但是从代码上看不出这一点
                return $http.get('/api/me');
            }else
                return $q.reject({message: 'User has no token.'});
        };
        return authFactory;
    }])

    // 处理认证标记的工厂对象
    .factory('AuthToken', ['$window', function ($window) {
        var authTokenFactory = {};

        // 获取标记其实就是从前端本地存储中获取一个token的标记
        authTokenFactory.getToken = function () {
            return $window.localStorage.getItem('token');
        };

        // 设置标记就是在前端本地存储中存放一个名称为token的标记，内容就是登陆认证信息
        authTokenFactory.setToken = function (token) {
            if (token)
                $window.localStorage.setItem('token', token);
            else
                $window.localStorage.removeItem('token');
        };
        return authTokenFactory;
    }])

    // 请求的认证信息注入工厂对象
    .factory('AuthInterceptor', ['$q', '$location', 'AuthToken', function ($q, $location, AuthToken) {
        var interceptorFactory = {};

        // 对于所有的请求方法，在配置中加入一个x-access-token头信息，内容就是认证的标记
        // 本质是保证所有请求都有认证信息，可以方便服务器查看请求的发起者信息
        interceptorFactory.request = function (config) {
            var token = AuthToken.getToken();
            if (token)
                config.headers['x-access-token'] = token;
            return config;
        };

        // 对返回的错误响应处理函数
        interceptorFactory.responseError = function (response) {

            // 只要返回了403错误，就清空登陆认证信息，需要重新登陆
            if (response.status == 403) {
                AuthToken.setToken();
                $location.path('/login');
            }
            // 返回错误信息
            return $q.reject(response);
        };
        return interceptorFactory;
    }]);