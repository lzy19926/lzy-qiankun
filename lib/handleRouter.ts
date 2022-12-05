/**
 *   用于处理路由变化的方法 
 */
import { getApps } from './index'
import { importHtml } from './importHtml'
import type { AppConfig } from './interface'

let currentApp: AppConfig | undefined = undefined;


export async function handleRouterChange() {
    // 1. 卸载上一次的应用
    const prevApp = currentApp
    if (prevApp) {
        unmountApp(prevApp)
    }

    // 2. 匹配子应用  
    const apps = getApps()


    // 从apps中查找对应activeRule的路由
    // 匹配hash和history路由
    const app =
        apps.find(item => window.location.pathname.startsWith(item.activeRule)) ||
        apps.find(item => ('/' + window.location.hash).startsWith(item.activeRule))


    // 未匹配到子应用时不进行处理
    if (!app) return
    currentApp = app
    console.log('路由变化,匹配app', app);

    // 3. 提供全局变量  让子应用之道自己是在微前端中执行 渲染到对应的容器中
    //todo 修改环境变量 修改webpack的静态资源请求路径,否则会从基座中请求资源
    window.__POWER_BY_LZY_QIANKUN__ = true
    window.__INJECTED_PUBLIC_PATH_BY_LZY_QIANKUN__ = app.entry + '/'

    // 4.加载子应用  从入口请求到该应用的html css js等资源  执行
    // 子应用通过webpack启动后,会打包并在3000端口放置对应的html,css,js等资源,从该端口请求资源
    const { htmlTemplate, getExternalScripts, getExternalStylesheet, callScripts } = await importHtml(app.entry)


    // 5 解析html 获取并执行JS代码 获得导出的三个生命周期函数 将其放到app对象中
    const appExports: any = await callScripts()

    app.bootstarp = appExports.bootstarp
    app.mount = appExports.mount
    app.unmount = appExports.unmount

    // 6 解析html 获取并执行CSS代码 
    const styleSheets = await getExternalStylesheet()
    app.styleSheets = styleSheets


    // 7 渲染子应用
    bootstarpApp(app)
    mountApp(app)
}




//todo 三个App生命周期逻辑
async function bootstarpApp(app: AppConfig) {
    app.bootstarp && await app.bootstarp()
}

//todo mount时将pros.container传递进去 渲染到对应的容器中
async function mountApp(app: AppConfig) {
    let shadowRoot: ShadowRoot;

    // 获取外层容器div作为shadowDomContainer
    let shadowDomContainer =
        document.querySelector(app.container) ||
        document.getElementById(app.container)

    if (!shadowDomContainer) { // 没有则创建一个container
        return console.error('未指定微前端容器')
    }

    // 创建应用的container
    const container = document.createElement('div')

    // 创建应用的shadowRoot
    if (!app.shadowRoot) {
        shadowRoot = shadowDomContainer.attachShadow({ mode: 'open' })
        app.shadowRoot = shadowRoot
    } else {
        shadowRoot = app.shadowRoot
    }


    app.mount && container && await app.mount({ container })

    // 给shadowDom注入styles
    // 使用shadowDom作为沙箱隔离    
    app.styleSheets.map((cssCode: string) => {
        let styleAttr = document.createElement('style')
        styleAttr.textContent = cssCode
        shadowRoot.appendChild(styleAttr)
    })

    shadowRoot.appendChild(container)
}

//todo unmount时将pros.container传递进去 渲染到对应的容器中
async function unmountApp(app: AppConfig) {
    const shadowRoot = app.shadowRoot
    const container = document.querySelector(app.container) // 获取容器div

    app.unmount && container && await app.unmount({ container })

    //todo 创建新container 替换老的  用于删除shadowDom(方案2)
    // const id = container?.getAttribute('id') || ''
    // const parentDom = container?.parentElement
    // const newContainer = document.createElement('div')
    // newContainer.setAttribute('id', id)
    // parentDom?.insertBefore(newContainer, container)
    // container?.remove()

    while (shadowRoot.firstChild) {
        shadowRoot.firstChild.remove();
    }
}



//! 问题 在hash模式下 刷新后如果没有shadowRoot,无法正常删除dom元素