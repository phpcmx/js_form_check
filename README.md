# js_fromCheck
一个对表单进行验证管理的js插件

使用方法

首先要声明对应的formCheck对象

    // 这里定义form验证类
    var formCheck = new FormCheck({
        selector : '#myForm',    // form表单的选择器
        isAjax : true,  // 表单提交方式 如果是true 就要自己组织ajax提交 如果是false 就只是判断能不能提交
        action : 'test.php',    // 要提交的地址 选填 且仅 isAjax:true 时有效，如果不填写应该从form表单的action属性中获取
        // method : 'post',    // 要提交的方式 选填 且仅 isAjax:true 时有效，如果不填写应该从form表单的method属性中获取
        // 验证前初始化的钩子
        startCheck : function(post){
            console.log('startCheck', post);
        },
        // 验证完成的钩子
        endCheck : function (res){
            console.log('endCheck', res);
        }
    });
    
其中FormCheck里有丰富的错误验证规则，可以通过以下方式获取方式列表（其实很多啦，如果还要更多，讲出来嘛）。
已经有的规则
1. require 必须，所标志的内容必须填写；
1. noRequire 非必须 如果为空就通过验证，如果不为空就继续验证；
1. compareWith 对比 和某个值进行对比，参数可以是字符串也可以是function回调。在做验证密码的时候可以搞搞嘛~；
1. lenLimit 限定长度 两个参数 min，max。内容限定在这两个值之间。如果没有传递max，就不验证最大（最下你可以传递0嘛，那跟验证不验证有什么区别？）;
1. regex 正则验证 传递正则验证规则；
1. post 异步请求验证 这个高级了嘿，你可以用ajax接口的方式验证参数是否正确，很高级哦~需要注意的是如果你没有设置blur为false，那么在取消焦点和表单提交的时候都会验证，也就是说会请求两次哦。

    
    
    // 获取可以验证的方法，里面全是对象实现方式看下
    var fVerifyType = formCheck.getVerifyType();
    
    

好的，所有的准备工作已经做完了，可以对表单进行验证规则的设置了哦。

    // 用户名验证
    formCheck.addVerify({
        id : '用户名',     // 用来标记同一个控件，同一个控件添加多个verify事件只会顺序执行，如果出错则不继续执行
        selector : '#loginAccount', // 表单的id
        blur : true,            // 是否在blur取消焦点事件时执行重新验证 默认是true
        DAlias : 'loginAccount', // 这个在程序里并没有被使用 这里就是演示如何创建自定义属性，这个能在success和error里调用 ，为了区分我加上了前缀，这是个好习惯
        // 验证 是一个验证对象数组，里面的内容有有三种 type success error
        verify:[{
            /// 添加account的长度验证
            type : fVerifyType.lenLimit(6, 16),  // 验证类型 between 介于两者之间
            // 验证成功 obj 是对象
            success : function(d){    // 成功类型返回的是当前配置的对象，比如这个你用 d.id 就能获取 "用户名"
                // 因为需要长度验证 并且 正则验证全通过，所以这里不处理，等下个正确再处理。ps:但是这里还是会执行
            },
            // 验证失败 可以设置统一的error错误处理，这里就可以省略了，也可以写上，做特殊化处理，这样就能覆盖错误提示了
            error :function(d, code, msg){
                showErrMsg(d.DAlias, msg);  // 这里调用的 d.DAlias 自定义属性
            }
        },{
            /// 添加account的正则验证
            type : fVerifyType.regex(/^[a-zA-Z0-9_]+$/)
        },{
            /// post验证账号唯一性
            type : fVerifyType.post("test.php?type=/users/verifyAccount", function(){return {account:$("#loginAccount").val()};}),
            success : function(d, res){     // 如果请求的是post型，则会有第二个参数，第二个参数是post的返回值
                // 判断下是否是json对象
                if(typeof res !== 'object'){
                    res = JSON.parse(res);
                }

                if(!res){
                    showErrMsg(d.DAlias, '网络错误');
                    console.log(res);
                }else if(res.code === 200){
                    showSuccMsg(d.DAlias);
                    return true;            // 这里返回的 true很重要 标记成功
                }else{
                    showErrMsg(d.DAlias,res.msg);
                    return false;           // 这里返回的false很重要，会影响记录的结果
                }
            }
        }],
        // 统一的错误提示代码，为了减少代码量嘛
        error : function (d, code, msg){
            showErrMsg(d.DAlias, msg);
        }
    });
    
好的，照着这个样子把所有的表单元素设置完毕就ok了哦~
是否很简单？~如果不简单，你找我！

# 附录

简单调用

    /// 密码验证
    formCheck.addVerify({
        id : '密码',
        selector : '#loginPsw',
        verify : [{
            /// 长度验证
            type : fVerifyType.lenLimit(6, 16)
        },{
            /// 密码正则验证
            type : fVerifyType.regex(/^[a-zA-Z0-9_!@#$%^&]+$/),
            success : function(d){
                console.log(d);
            }
        }],
        error : function (d, code, msg){
            console.log(d, code, msg);
        }
    });
    
    
所有类别的调用参数：
 
    // 获取可以验证的方法，里面全是对象实现方式看下
    var fVerifyType = formCheck.getVerifyType();
    
    // require
    fVerifyType.require();
    
    // noRequire
    fVerifyType.noRequire();
    
    // compareWith
    fVerifyType.compareWith('value');
    fVerifyType.compareWith(function(){
        $('#selector').val();
    });
    
    // lenLimit
    fVerifyType.lenLimit(3, 20);
    
    // regix
    fVerifyType.regix(/^[0-9]$/i);
    
    // post
    fVerifyType.post(url, data);
