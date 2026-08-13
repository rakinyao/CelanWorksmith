# CelanWorksmith 阶段备份记录

时间：2026-08-08 17:05:39（Asia/Shanghai）  
阶段：B3 修复完成后的开发机可靠性备份

## 备份位置

`/home/gavin/backups/CelanWorksmith/stage-20260808-170539`

目录权限为 `0700`；运行配置中的 `.env` 副本为 `0600`。

## 已备份内容

- Git 全部本地引用 bundle：`code/repository-all-refs.bundle`
- 当前工作树状态：二进制 patch、暂存 patch、未跟踪文件清单和完整工作树归档
- 服务配置：`app/server/.env`、`application-ce.properties`
- MongoDB 逻辑导出：Appsmith、本体工程、运行时数据全部数据库 archive
- Redis：执行 `SAVE` 后导出的 `dump.rdb`
- `SHA256SUMS` 完整性校验清单和 `README.md` 恢复指南

## 校验结果

- Git bundle、工作树归档均已生成。
- MongoDB archive 通过 `gzip -t` 验证。
- 工作树 archive 通过 `tar -tzf` 验证。
- Redis 快照从 `appsmith-redis:/data/dump.rdb` 成功复制。

## 当前代码状态

- 分支：`codex/celanworksmith-t5-checkpoint`
- 备份时 HEAD：`75455ba7c4e06ee304c15fd3c4fbd5412d08ac04`
- B0-B2 已完成；B3 的 Form/Input 本体约束修复已提交，任务级复审仍待完成。
- 工作区保留 T-Foundation/T8 等前置未提交变更；它们已纳入工作树归档与 patch，不应在恢复时丢弃。

## 恢复注意事项

- 数据库恢复必须在停止的目标实例或隔离环境中执行。
- Redis RDB 恢复前必须先停止目标 Redis。
- 恢复前先运行备份目录 `README.md` 中的校验命令；不要覆盖更新于本备份的目标数据。
