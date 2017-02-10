/**
 * HTML 转义和反转义功能
 * Created by Administrator on 2015/9/19.
 */

var REGX_HTML_ENCODE = /"|&|'|<|>|[\x00-\x20]|[\x7F-\xFF]|[\u0100-\u2700]/g;

    var REGX_HTML_DECODE = /&\w+;|&#(\d+);/g;

    var REGX_TRIM = /(^\s*)|(\s*$)/g;

    var HTML_DECODE = {
        "&lt;" : "<",
        "&gt;" : ">",
        "&amp;" : "&",
        "&nbsp;": " ",
        "&quot;": "\"",
        "©": ""

        // Add more
    };

    var encodeHtml = function(s){
        s = (s != undefined) ? s : this.toString();
        return (typeof s != "string") ? s :
            s.replace(REGX_HTML_ENCODE,
                function($0){
                    var c = $0.charCodeAt(0), r = ["&#"];
                    c = (c == 0x20) ? 0xA0 : c;
                    r.push(c); r.push(";");
                    return r.join("");
                });
    };

    var decodeHtml = function(s){
        var HTML_DECODE = HTML_DECODE;

        s = (s != undefined) ? s : this.toString();
        return (typeof s != "string") ? s :
            s.replace(REGX_HTML_DECODE,
                function($0, $1){
                    var c = HTML_DECODE[$0];
                    if(c == undefined){
                        // Maybe is Entity Number
                        if(!isNaN($1)){
                            c = String.fromCharCode(($1 == 160) ? 32:$1);
                        }else{
                            c = $0;
                        }
                    }
                    return c;
                });
    };

    trim = function(s){
        s = (s != undefined) ? s : this.toString();
        return (typeof s != "string") ? s :
            s.replace(REGX_TRIM, "");
    };


    var hashCode = function(){
        var hash = this.__hash__, _char;
        if(hash == undefined || hash == 0){
            hash = 0;
            for (var i = 0, len=this.length; i < len; i++) {
                _char = this.charCodeAt(i);
                hash = 31*hash + _char;
                hash = hash & hash; // Convert to 32bit integer
            }
            hash = hash & 0x7fffffff;
        }
        this.__hash__ = hash;

        return this.__hash__;
    };

/** TODO 替换字符串
 %3A    :
 %2F    /
 %20
 */
//http://errors.angularjs.org/1.4.6/$injector/modulerr?p0=userApp&p1=Error%3A%20%5B%24injector%3Aunpr%5D%20http%3A%2F%2Ferrors.angularjs.org%2F1.4.6%2F%24injector%2Funpr%3Fp0%3D%2524selectProvider%0A%20%20%20%20at%20Error%20(native)%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A6%3A416%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A40%3A409%0A%20%20%20%20at%20d%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A38%3A394)%0A%20%20%20%20at%20Object.e%20%5Bas%20invoke%5D%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A39%3A161)%0A%20%20%20%20at%20d%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A374)%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A498%0A%20%20%20%20at%20m%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A7%3A322)%0A%20%20%20%20at%20g%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A275)%0A%20%20%20%20at%20fb%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A41%3A35

//var t = decodeHtml('http://errors.angularjs.org/1.4.6/$injector/modulerr?p0=userApp&p1=Error%3A%20%5B%24injector%3Aunpr%5D%20http%3A%2F%2Ferrors.angularjs.org%2F1.4.6%2F%24injector%2Funpr%3Fp0%3D%2524selectProvider%0A%20%20%20%20at%20Error%20(native)%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A6%3A416%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A40%3A409%0A%20%20%20%20at%20d%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A38%3A394)%0A%20%20%20%20at%20Object.e%20%5Bas%20invoke%5D%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A39%3A161)%0A%20%20%20%20at%20d%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A374)%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A498%0A%20%20%20%20at%20m%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A7%3A322)%0A%20%20%20%20at%20g%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A275)%0A%20%20%20%20at%20fb%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A41%3A35')
//console.log('to ', t);
//console.log('return ', decodeHtml(t));

var t = 'http://errors.angularjs.org/1.4.6/$injector/modulerr?p0=userApp&p1=Error%3A%20%5B%24injector%3Aunpr%5D%20http%3A%2F%2Ferrors.angularjs.org%2F1.4.6%2F%24injector%2Funpr%3Fp0%3D%2524selectProvider%0A%20%20%20%20at%20Error%20(native)%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A6%3A416%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A40%3A409%0A%20%20%20%20at%20d%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A38%3A394)%0A%20%20%20%20at%20Object.e%20%5Bas%20invoke%5D%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A39%3A161)%0A%20%20%20%20at%20d%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A374)%0A%20%20%20%20at%20http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A498%0A%20%20%20%20at%20m%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A7%3A322)%0A%20%20%20%20at%20g%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A37%3A275)%0A%20%20%20%20at%20fb%20(http%3A%2F%2Flocalhost%3A8080%2Fpublic%2Fbower%2Fangular%2Fangular.min.js%3A41%3A35';
//console.log(t.replace(/%20/gm, '_'));
//console.log(unescape(t));
console.log(decodeURIComponent(t));
