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

## 发布到 GitHub Pages

仓库已内置自动发布工作流：

- `.github/workflows/deploy-pages.yml`
- `public/CNAME`（已指向 `war3rpg.667233.xyz`）

首次启用需要在 GitHub 仓库中设置：

1. 进入 `Settings` -> `Pages`
2. `Build and deployment` 选择 `Source: GitHub Actions`
3. 推送到 `main` 分支后，会自动构建并发布

## 自定义域名

项目已通过 `public/CNAME` 配置为：

- `war3rpg.667233.xyz`

还需在你的 DNS 服务商处配置域名解析到 GitHub Pages（通常为 `A` 记录到 GitHub Pages IP，或按你现有域名策略配置）。
