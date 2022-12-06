
//! 注意点 1. 因为安全问题 innerHTML中的script不会执行 需要手动执行
//todo  乾坤中使用import-html-entry库  用来通过html字符串,获取对应的html模板,js代码内容,css内容
// 这里简易实现一下import-html-entry库


import ProxySandbox from './sandBox'

// 通过url获取html,并返回js,html,执行js的方法
export async function importHtml(url: string) {

    // 通过fetch请求到html资源
    const html = await fetch(url).then(res => res.text())
    const htmlTemplate = document.createElement('div')
    htmlTemplate.innerHTML = html

    // 获取script标签 及其内容代码  (两种script)
    // 从标签中获取src属性 请求  或者直接获取innerHTML
    // 需要将结果数组包裹为Promise,使用.all进行处理
    function getExternalScripts() {
        const scripts = htmlTemplate.querySelectorAll('script')

        const resList = Array.from(scripts).map((script: HTMLScriptElement) => {
            const src = script.getAttribute('src')
            if (!src) { //TODO 直接将内部JS代码用Promise包裹返回
                return Promise.resolve(script.innerHTML)
            } else {    //TODO 解析src 请求代码 返回结果Promise(需要对src做处理 查看是否是http开头的)
                let jsURL = src.startsWith('http') ? src : url + src
                if(src.startsWith('http')){
                    jsURL = src
                }else if(src.startsWith('.')){
                    jsURL = url + src.slice(1)
                }
                
                return fetch(jsURL).then(res => res.text())
            }
        })

        return Promise.all(resList)
    }

    function getExternalStylesheet(){
        const styles:HTMLLinkElement[] = []
        const links = htmlTemplate.querySelectorAll('link')
        // 收集styleSheet
        Array.from(links).forEach((link:HTMLLinkElement)=>{
            if(link.getAttribute('rel')==='stylesheet'){
                styles.push(link)
            }
        })
        
        const resList = styles.map((link:HTMLLinkElement) => {
            const href = link.getAttribute('href')
            if (!href) { //TODO 直接将内部JS代码用Promise包裹返回
                return Promise.resolve(link.innerHTML)
            } else {    //TODO 解析src 请求代码 返回结果Promise(需要对src做处理 查看是否是http开头的)
                let cssURL = href.startsWith('http') ? href : url + href
                if(href.startsWith('http')){
                    cssURL = href
                }else if(href.startsWith('.')){
                    cssURL = url + href.slice(1)
                }
                console.log('请求css资源');
                
                return fetch(cssURL).then(res => res.text())
            }
        })

        return Promise.all(resList)
    }

    //todo 获取并执行代码执行这些代码(获取生命周期钩子)
    //TODO 获取code中webpack导出的factory函数 思路在最下方
    async function callScripts() {

        const scriptsCode = await getExternalScripts()

        // 手动构建cjs环境
        const module = { exports: {} }
        const exports = module.exports

        //todo 给脚本注入沙箱隔离window
       

        scriptsCode.forEach((code: string) => {
            //! 注意 eval执行的代码可以访问外部变量 (自定义的module)
            // 执行后 会将factory()接入exports中  
            eval(code)            
        })

        // 此时module.exports就有了factory()的结果,也就是子应用入口中导出的三个生命周期钩子
        return module.exports
    }

    return {
        htmlTemplate,
        getExternalScripts,
        getExternalStylesheet,
        callScripts,
    }
}






// 以下是UMD模块化方案打包后的webpack代码
// 可以看到 用于适配各种模块化方案  用四种不同模式将factory()进行导出
//! 所以我们通过手动构建cjs环境,并插入eval的代码中,将factory函数接出来
// (function webpackUniversalModuleDefinition(root, factory) {
//     if (typeof exports === 'object' && typeof module === 'object') //todo 适配cjs 用module.export 导出factory函数
//         module.exports = factory();
//     else if (typeof define === 'function' && define.amd) //todo 适配amd 用define 导出factory函数
//         define([], factory);
//     else if (typeof exports === 'object')   //todo 适配esm 用export 导出factory函数
//         exports["react_app-main"] = factory();
//     else
//         root["react_app-main"] = factory();//todo 默认导出(在浏览器端root为window)
// })((window: Window) => { 

 // daoma 

//})