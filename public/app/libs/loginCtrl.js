// 主控制器
angular.module('loginCtrl', ['utilsService'])
    // 登陆时的控制器
    .controller('loginController', ['$rootScope', '$location', 'Auth', 'UtilsService', '$window'
        , function ($rootScope, $location, Auth, UtilsService, $window) {
        var vm = this;
        vm.permission = Auth.permission;
        vm.loggedIn = Auth.isLoggedIn();

        //默认登录名和密码
        vm.loginData = {};

        // check to see if a user is logged in on every request
        /**
         Checking if a user is logged in We will check if a user is logged in using the Auth.isLoggedIn()
         function. This will check to see if there is a token in localStorage. We are also using a module we
         haven’t used before called $rootScope to detect a route change and check if our user is still logged
         in. This means that every time we visit a different page, we will check our user’s login state.
         */
        // 每一次访问不同的页面都需要检查是否已经登陆
        $rootScope.$on('$routeChangeStart', function () {
            // 每次登陆时更新登陆标志
            vm.loggedIn = Auth.isLoggedIn();

            // 并且将当前用户信息保存到user变量里面
            var data = Auth.readUser();
            if(data){
                vm.user = data;
                vm.permission = Auth.permission;
            }else{//刷新后Auth的信息可能被清除了，这里需要重新获取
                Auth.getUser().then(function (data) {
                    vm.user = data.data;
                    Auth.setUser(data.data);
                    vm.permission = Auth.permission;
                });
            };
        });

        //查询是否具有某一个视图的任意一个授权
        //用来决定一个菜单是否显示
        vm.allowed = function(frame){
            if(!vm.permission) return false;
            var ps = vm.permission[frame];
            if(ps){
                for(var i in ps){
                    if(ps[i])
                        return true;
                }
            }
            return false;
        };

        // 登陆控制器添加登陆的方法
        vm.doLogin = function () {
            vm.processing = true;
            vm.error = '';

            // 用当前的username和password完成登陆
            Auth.login(vm.loginData.username, vm.loginData.password).success(function (data) {
                vm.processing = false;

                if (data.success) {
                    //更新用户时也同时保存当前用户到Auth服务中，便于各视图来查看权限
                    vm.user = data.user;
                    Auth.setUser(data.user);
                    vm.permission = Auth.permission;

                    //用户登录成功，删除其他用户保存的缓存数据
                    UtilsService.loginStorage(data.user._id);

                    // 如果登陆成功，跳转到/users路径下
                    $location.path('/');
                }else
                    vm.error = data.message;
            });
        };

        // 登出函数
        vm.doLogout = function () {
            // 清空前段登陆数据
            Auth.logout();
            vm.loggedIn = false;
            // 清空页面user变量
            vm.user = '';
            // 跳转到登陆页面
            $location.path('/');
        };
    }]);
