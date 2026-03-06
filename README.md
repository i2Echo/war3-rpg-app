# 西方世界的劫难3 炼化公式查询

一个基于 Vue 3 + Vite 的网页工具，支持炼化路线查询、物品属性查询与反查，面向移动端优化。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 访问统计（无自建后端）

项目已接入不蒜子（Busuanzi）前端统计脚本：

- 页面总访问量（PV）
- 独立访客数（UV）

实现方式：

- 在 `index.html` 引入 `busuanzi.pure.mini.js`
- 在 `src/App.vue` 的信息栏展示统计值

如果不需要统计，删除 `index.html` 中对应脚本即可。
