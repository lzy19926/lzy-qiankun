"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRouterChange = void 0;
/**
 *   用于处理路由变化的方法
 */
const index_1 = require("./index");
const importHtml_1 = require("./importHtml");
let currentApp = undefined;
function handleRouterChange() {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. 卸载上一次的应用
        const prevApp = currentApp;
        if (prevApp) {
            unmountApp(prevApp);
        }
        // 2. 匹配子应用  
        const apps = (0, index_1.getApps)();
        // 从apps中查找对应activeRule的路由
        const app = apps.find(item => window.location.pathname.startsWith(item.activeRule));
        currentApp = app;
        console.log('路由变化,匹配app', app);
        // 未匹配到子应用时不进行处理
        if (!app)
            return;
        // 3. 提供全局变量  让子应用之道自己是在微前端中执行 渲染到对应的容器中
        //todo 修改环境变量 修改webpack的静态资源请求路径,否则会从基座中请求资源
        window.__POWER_BY_LZY_QIANKUN__ = true;
        window.__INJECTED_PUBLIC_PATH_BY_LZY_QIANKUN__ = app.entry + '/';
        // 4.加载子应用  从入口请求到该应用的html css js等资源  执行
        // 子应用通过webpack启动后,会打包并在3000端口放置对应的html,css,js等资源,从该端口请求资源
        const { htmlTemplate, getExternalScripts, getExternalStylesheet, callScripts } = yield (0, importHtml_1.importHtml)(app.entry);
        // 5 解析html 获取并执行JS代码 获得导出的三个生命周期函数 将其放到app对象中
        const appExports = yield callScripts();
        app.bootstarp = appExports.bootstrap;
        app.mount = appExports.mount;
        app.unmount = appExports.unmount;
        // 6 解析html 获取并执行CSS代码 
        const styleSheets = yield getExternalStylesheet();
        app.styleSheets = styleSheets;
        // 7 渲染子应用
        bootstarpApp(app);
        mountApp(app);
    });
}
exports.handleRouterChange = handleRouterChange;
let shadowRoot;
//todo 三个App生命周期逻辑
function bootstarpApp(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.bootstarp && (yield app.bootstarp());
    });
}
//todo mount时将pros.container传递进去 渲染到对应的容器中
function mountApp(app) {
    return __awaiter(this, void 0, void 0, function* () {
        let shadowDomContainer = document.querySelector(app.container); // 获取外层容器div作为shadowDomContainer
        if (!shadowDomContainer) { // 没有则创建一个container
            shadowDomContainer = document.createElement('div');
            shadowDomContainer.setAttribute('id', app.container);
            document.appendChild(shadowDomContainer);
        }
        const container = document.createElement('div'); // 创建应用的container
        if (!shadowRoot) { // 创建应用的shadowRoot
            shadowRoot = shadowDomContainer.attachShadow({ mode: 'open' });
        }
        app.mount && (yield app.mount({ container }));
        // 给shadowDom注入styles
        // 使用shadowDom作为沙箱隔离    
        app.styleSheets.map((cssCode) => {
            let styleAttr = document.createElement('style');
            styleAttr.textContent = cssCode;
            shadowRoot.appendChild(styleAttr);
        });
        shadowRoot.appendChild(container);
    });
}
//todo unmount时将pros.container传递进去 渲染到对应的容器中
function unmountApp(app) {
    return __awaiter(this, void 0, void 0, function* () {
        const container = document.querySelector(app.container); // 获取容器div
        app.unmount && (yield app.unmount({ container }));
        while (shadowRoot.firstChild) {
            shadowRoot.firstChild.remove();
        }
    });
}
