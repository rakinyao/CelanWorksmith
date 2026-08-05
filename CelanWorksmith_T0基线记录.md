# CelanWorksmith T0 基线记录

记录日期：2026-08-03

## 代码基线

- Git 分支：`release`
- Git 基线提交：`665fbf1f33`
- 工作区已有中英双语改造、`CODE_WIKI.md` 和实施计划文档变更；本次 T0 不回退这些文件。
- T0 不创建提交或 tag，由后续阶段在验证通过后按阶段提交。

## 工具链

| 工具 | 版本 |
|------|------|
| Node.js | `v24.14.1` |
| Yarn | `3.5.1` |
| Java | `25.0.3` |
| Maven | `3.9.12` |
| Docker Engine | `29.1.3` |

## 基础设施

| 服务 | 容器/地址 | 状态 |
|------|-----------|------|
| MongoDB | `appsmith-mongodb:27017` / `mongodb://localhost:27017` | 运行中 |
| Redis | `appsmith-redis:6379` / `redis://localhost:6379` | 运行中 |
| Nginx | `wildcard-nginx` | 运行中 |
| Appsmith 后端 | `127.0.0.1:8081` | 记录时未启动 |
| Appsmith 前端 | `127.0.0.1:3000` | 记录时未启动 |

## T0 结论

基础设施和构建工具链已就绪。后端和前端进程需要按项目开发启动方式启动后再执行登录页、编辑器和原生 Widget 的手工回归；这不阻塞 T1/T2 的服务端单元测试和编译验证。
