/**
 * Created by cmx on 2017/5/16.
 */


// formCheck对象
function FormCheck(userConfig){
    // 合并配置项
    var config = {
        debug : false,           // debug测试模式
        selector : '#myForm',    // form表单的选择器
        isAjax : true,  // 表单提交方式 如果是true 就要自己组织ajax提交 如果是false 就只是判断能不能提交
        action : null,    // 要提交的地址 选填 且仅 isAjax:true 时有效，如果不填写应该从form表单的action属性中获取
        method : null,    // 要提交的方式 选填 且仅 isAjax:true 时有效，如果不填写应该从form表单的method属性中获取
        // 验证前初始化的钩子
        startCheck : function(post){},
        // 验证完成的钩子
        endCheck : function (result){},
        verifyList : []     // 其实所有的验证都记录在这里哦
    };
    $.extend(config, userConfig);
    config.debug && console.log('    config:', config);

    // 全局信号量
    var signal = {
        checking : false,       // 是否正在执行 检查（为了方式重复的初始化变量，因为可能多次触发提交表单事件）
        checkStop : false,      // 全局检查是否停止
        result : null,           // 表单验证结果
        postCnt : 0,            // 记录当前跑的post验证
        /**
         * 添加post请求
         * @return {number}
         */
        PPost:function(){
            this.postCnt++;
            return this.postCnt;
        },
        /**
         * post请求结果返回
         * @return {number}
         */
        VPost:function(){
            this.postCnt--;
            _checkFormSuccess();
            // 如果是提交开启的检查，就会重新激活提交事件
            if(signal.checking)
                $(config.selector).submit();
            return this.postCnt;
        },
        /**
         * 判断是否正在有post执行
         * @returns {boolean}
         */
        isHasPost:function(){
            return this.postCnt > 0;
        },
        log: function(){
            console.log('    signal:', 'checking:',this.checking, ';checkStop:', this.checkStop, ';result', this.result, ';postCnt', this.postCnt);
        }
    };
    config.debug && signal.log();


    // 错误对象我给你完成了
    var verifyType = {
        // 必须 不能为空
        require : function(){
            return {type:'require'};
        },
        // 非必须 为空放行
        noRequire : function (){
            return {type: 'noRequire'};
        },
        // 比较必须相同
        compareWith : function(value){
            return {type:'compareWith', value:value};
        },
        // 所在的值必须在范围
        lenLimit : function (min, max){
            return {type:'lenLimit', min:min, max:max};
        },
        // 正则验证格式
        regex : function(reg){
            return {type:'regex', reg:reg};
        },
        // post 验证数据
        post : function(url, data){
            return {type:'post', url:url, data:data};
        }
    };

    // 错误码列表
    var errCode = {
        ok : 0,
        require : 1,
        noRequire : 2,
        compareWith : 3,
        lenLimitMin : 4,
        lenLimitMax : 5,
        regex : 6,
        post : 7
    };


    // 绑定表单的提交事件
    $(config.selector).submit(function(e){
        config.debug && console.log('EVENT::submit');
        config.debug && signal.log();
        config.debug && console.log("    config:",config);
        // 总是阻止
        e.preventDefault();
        // 要提交的表单数据
        var post = $(config.selector).serializeArray();
        config.debug && console.log('serializeArray:',post);

        // 如果是第一次执行，则会执行初始化
        console.log(signal.checking);
        if(!signal.checking){
            init();

            // 先进行初始化 要传递表单数组 [{name:"控件name",value:"控件值"},{},{},{}]
            config.startCheck(post);
        }


        // 如果没有 验证成功 ，就执行验证的这一套  false null
        if(!signal.result){
            // 进行验证
            checking(e);
        }

        // 判断什么时候不能提交
        // if(signal.result !== true || signal.isHasPost()){
        //     config.debug && console.log("阻止提交：");
        //     config.debug && signal.log();
        //     e.preventDefault();
        // }

        config.debug && console.log('###formResult:');
        config.debug && signal.log();
        // 判断是否结束了验证
        // 验证结果不为null 并且没有post在执行
        if(signal.result !== null && !signal.isHasPost()){
            // 判断提交方式

            if(signal.result ===true){
                if(config.isAjax) {
                    // 阻止表单提交
                    e.preventDefault();

                    console.log(config);
                    // 这里获取ajax内容
                    $.ajax({
                        url: config.action,
                        data: $.param(post),
                        type: config.method,
                        success: function (res) {
                            // ajax 方式提交的内容会通过endCheck进行验证
                            config.endCheck(res);
                        },
                        error: function () {
                        }
                    });
                }else{
                    $(this).off('submit').submit();
                    config.endCheck(null);
                }
            }else{
                // 最后收尾钩子
                config.endCheck(null);
            }

            // 设置检查结束
            signal.checking = false;
        }
        config.debug && console.log('###formResult:');
        config.debug && signal.log();
    });


    /**
     * 初始化参数
     */
    function init(){
        config.debug && console.log('↓↓↓↓↓↓↓↓↓↓FUN::init::START');
        // 设置表单验证状态为true
        signal.checking = true;

        var formObj = $(config.selector);
        // 如果isAjax为true 就需要初始化这些参数
        if(config.isAjax){
            config.action = config.action===null ? formObj.attr('action') : config.action;
            config.method = config.method===null ? formObj.attr('method') : config.method;
        }
        // 设置表单的停止检查为false
        signal.checkStop = false;
        // 设置默认表单
        signal.result = null;

        for(var n in config.verifyList){
            // 把控件的停止检查设置为false
            config.verifyList[n].checkStop = false;
            // 设置默认返回结果
            config.verifyList[n].result = null;
        }

        config.debug && signal.log();
        config.debug && console.log('----------FUN::init::END.\n');
    }

    /**
     * 检查函数 最关键的哦
     */
    function checking (e){
        config.debug && console.log('↓↓↓↓↓↓↓↓↓↓FUN::checking::START');
        // 遍历控件
        for (var n in config.verifyList){
            // 每个控件检查前都判断是否继续进行表单验证
            if(signal.checkStop) break;

            // 验证配置，别名
            var option  = config.verifyList[n];

            // 如果有结果不正确，就重新验证一次
            if(option.result !== true) {
                config.debug && console.log('verify:START', option.id, option);
                verify(option);
                config.debug && console.log('verify:END', option.id, option, "\n");
            }
        }

        // 验证整个表单是否都验证成功
        _checkFormSuccess();

        config.debug && console.log('----------FUN::checking::END\n');
    }


    /**
     * 单个控件验证器
     */
    function verify(option){
        // 重新打开停止遍历
        option.checkStop = false;

        // 遍历验证方法
        for (var m in option.verify){
            config.debug && console.log("   "+option.id, '::'+option.verify[m].type.type ,"result:"+option.verify[m].result);

            // 每次运行检查前都判断是否需要继续
            if(option.checkStop)break;
            // 设置验证结果为空
            option.verify[m].result = null;
            // 判断验证类型，去验证
            switch(option.verify[m].type.type){
                case 'require':
                    _verifyRequire(option, m);
                    break;
                case 'noRequire':
                    _verifyNoRequire(option, m);
                    break;
                case 'compareWith':
                    _verifyCompareWith(option, m, option.verify[m].type.value);
                    break;
                case 'lenLimit':
                    _verifyLenLimit(option, m, option.verify[m].type.min, option.verify[m].type.max);
                    break;
                case 'regex':
                    _verifyRegex(option, m, option.verify[m].type.reg);
                    break;
                case 'post':
                    _verifyPost(option, m, option.verify[m].type.url, option.verify[m].type.data);
                    break;
                default:
            }
        }

        // 这里验证是否所有的验证都成功了
        _checkOptionSuccess(option);
    }


    function _verifyRequire(option, index){
        // 生成dom控件
        var obj = $(option.selector);
        var value = obj.val();

        if(value.match(/^\s*$/i)){
            var msg = option.id+"为必填";
            _failCheck(option, index, errCode.require, msg);
            return ;
        }

        _successCheck(option, index, null);
    }
    function _verifyNoRequire(option, index){
        // 生成dom空间
        var obj = $(option.selector);
        var value = obj.val();

        // 这个方法不会失败
        if(value === ''){
            // 如果为空 阻止继续遍历，执行下个去
            option.checkStop = true;
            _successCheck(option, index, null);
        }
    }
    function _verifyCompareWith(option, index, compareValue){
        var obj = $(option.selector);
        var value = obj.val();

        if(typeof compareValue === 'function'){
            compareValue = compareValue();
        }

        if(value !== compareValue){
            var msg = option.id+"不正确";
            _failCheck(option, index, errCode.compareWith, msg);
            return ;
        }

        _successCheck(option, index, null);
    }
    function _verifyLenLimit(option, index, min, max){
        var obj = $(option.selector);
        var value = obj.val();

        // 都改成回调模式
        if(typeof min === 'function'){
            min = min();
        }
        if(typeof max === 'function'){
            max = max();
        }

        var msg ;
        if(value.length < min){
            msg = option.id + "不能小于" + min;
            _failCheck(option, index, errCode.lenLimitMin, msg);
            return ;
        }
        if(value.length > max){
            msg = option.id + "不能大于" + max;
            _failCheck(option, index, errCode.lenLimitMax, msg);
            return ;
        }
        _successCheck(option, index, null);
    }
    function _verifyRegex(option, index, reg){
        var obj = $(option.selector);
        var value = obj.val();

        if(typeof reg === 'function'){
            reg = reg();
        }

        if(!value.match(reg)){
            var msg = option.id + "格式不正确";
            _failCheck(option, index, errCode.regex, msg);
            return ;
        }
        _successCheck(option, index, null);
    }
    function _verifyPost(option, index, url, data){
        // var obj = $(option.selector);
        // var value = obj.val();
        // 设置正在post 互斥量
        if(typeof option.verify[index].posting === 'undefined' || option.verify[index].posting === false){
            option.verify[index].posting = true;
        }else if(option.verify[index].posting === true){
            return;
        }

        // 改成回调模式
        if(typeof data === 'function'){
            data = data();
        }
        if(typeof url === 'function'){
            url = url();
        }

        signal.PPost();
        $.ajax({
            url : url,
            data : data,
            type : 'POST',
            success : function(d){
                _successCheck(option, index, d);
                _checkOptionSuccess(option);
                signal.VPost();
                option.verify[index].posting = false;
            },
            error : function (xhr){
                _failCheck(option, index, errCode.post, xhr.status + " " + xhr.statusText);
                _checkOptionSuccess(option);
                signal.VPost();
                option.verify[index].posting = false;
            }
        });
    }


    /**
     * 验证是否控件所有的验证都已经成功了
     */
    function _checkOptionSuccess(option){
        var flag = true;
        for(var n in option.verify){
            if(option.verify[n].type.type==='noRequire' && option.verify[n].result===true){
                break;
            }else if(option.verify[n].result !== true){
                flag = option.verify[n].result;
                break;
            }
        }

        option.result = flag;
    }


    /**
     * 验证是否表单所有的控件都已经成功了
     */
    function _checkFormSuccess(){
        var flag = true;
        for(var n in config.verifyList){
            if(config.verifyList[n].result !== true){
                flag = config.verifyList[n].result;
                break;
            }
        }

        signal.result = flag;
    }


    /**
     * 设置失败
     */
    function _failCheck(option, index, code, msg, onlySet) {
        config.debug && console.log('        FAIL:', option.id, arguments);

        // 设置结果
        option.verify[index].result = false;    // 当前验证失败
        option.result = false;                  // 当前控件验证失败
        signal.resutl = false;                  // 当前表单验证失败

        // 阻止当前控件继续检查
        option.checkStop = true;
        // 这里没有阻止整体检查
//            signal.checkStop = true;

        if (typeof onlySet === 'undefined' || !onlySet) {
            // 跑错误回调，如果没有个性化设置就执行统一设置
            if (typeof option.verify[index].error === 'undefined') {
                option.error(option, code, msg);
            } else {
                option.verify[index].error(option, code, msg);
            }
        }
    }

    /**
     * 设置成功
     */
    function _successCheck(option, index, res){
        config.debug && console.log('        SUCCESS:', option.id, arguments);
        // 设置结果 不能验证控件成功或者表单成功
        option.verify[index].result = true;     // 当前验证成功

        var re;
        // 跑成功回调，如果没有就执行通用的成功
        if(typeof option.verify[index].success === 'undefined'){
            re = option.success(option, res);
        }else{
            re = option.verify[index].success(option, res);
        }

        // success 的回调函数的返回值如果是false，依然被定义为失败
        if(re === false){
            _failCheck(option, index, errCode.post, '验证失败', true);
        }
    }

    /**
     * 添加验证函数 这个也很关键
     */
    function addVerify(userOption){
        // 获取参数
        var option = _getOption(userOption);
        if(!option) return false;

        // 记录到本地
        config.verifyList.push(option);

        // 绑定重新验证事件
        if(option.blur){
            $(option.selector).blur(function(e){
                option.result = null;
                verify(option);
            });
        }
    }

    /**
     * 设置verify对象
     * @return object|false
     */
    function _getOption(userOption){
        // 默认参数
        var option = {
//                id : null;                        // 这个必须
//                selector : null;                  // 这个也必须
            blur : true,                        // 是否在失去焦点时验证
            verify : [],                       // 要验证的类型
            success : function (d, res){},    // 其实也有个统一正确处理
            error : function (d, code, msg){},   // 统一错误处理
            checkStop : false,                   // 当前这个控件是否继续检查
            result : true                       // 当前控件执行结果
        };
        // 合并
        $.extend(option, userOption);
        // 验证完整性
        if(typeof option.id === 'undefined' || typeof option.selector === 'undefined'){
            return false;
        }

        // 给每个验证方法下添加result字段
        for(var n in option.verify){
            option.verify[n].result = null;
        }

        return option;
    }

    // 需要返回的
    return {

        // 这个是错误对象我就给你完成一部分了
        getVerifyType : function (){
            return verifyType;
        },
        // 添加事件
        addVerify : addVerify,
        // 单独执行某个验证
        verify : function(id){
            for(var n in config.verifyList){
                if(config.verifyList[n].id === id){
                    verify(config.verifyList[n]);
                    return config.verifyList[n].result;
                }
            }
        }
    };
}
