# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

**Vibe-coding-Cemetery** 是一个公开的 vibe-coding 失败项目档案库，按四个分类归档：Stillborn（胎死腹中）、Beautiful-Junk（美丽垃圾）、AI-Hallucination（AI 幻觉）和 Market-Fail（市场失败）。贡献者通过提交 Issue 来埋葬失败项目。

## 自动化流程

1. 贡献者提交 Issue（填写尸检报告）
2. Maintainer 审核后打上 `approved` 标签并关闭 Issue（`approved` 必须在 close 时已存在）
3. GitHub Actions 触发，检查 `approved` 标签 → 有则归档，无则静默退出
4. `scripts/process_submission.js` 执行：
   - 解析 Issue body（二级标题 `##` 分隔字段）
   - 检查必填字段、分类有效性、重复提交
   - 生成墓碑 `.md` 文件写入对应分类目录
   - 用 Node.js 正则更新 README.md 表格
   - Commit + Push（GITHUB_TOKEN）

**错误通知策略：**
- 提交问题（字段缺失、分类无效、重复）→ 打标签 + comment，贡献者和 maintainer 都能看到
- 代码内部错误（push 失败等）→ 仅记录在 Actions Job Summary，由 maintainer 查看

## Label 体系

| 标签 | 触发时机 | 含义 |
|------|---------|------|
| `pending` | Issue 创建时（模板默认） | 等待审核 |
| `approved` | Maintainer 手动打 | 审核通过，close 时触发归档 |
| `auto-generated` | `/bury-my-project` skill 提交时 | 区分 AI 提交 vs 人工提交 |
| `duplicate` | 脚本检测到重复 | 同一 repo URL 已存在 |
| `invalid` | 脚本检测到提交问题 | 字段缺失或分类无效 |

## Issue 模板字段（字段标题即解析 key，不可更改）

| 字段标题 | 规则 |
|------|------|
| `项目名称` | 必填 |
| `归属分类` | 必填，下拉选择 |
| `当初的幻觉 (Vision)` | 必填 |
| `死亡原因 (Cause of Death)` | 必填 |
| `技术栈` | 必填 |
| `项目链接（可选）` | 选填 |
| `墓志铭（可选）` | 选填 |

## 规范

- **Commit 消息：** Conventional Commits 格式 — `feat:`、`fix:`、`chore:`、`docs:`
- **Issue 正文：** 必须遵循 `.github/ISSUE_TEMPLATE/bury-my-project.yml` 模板格式

## 关键文件

- `@INITIAL.md` — 项目规格和架构计划（中文）
- `@README.md` — 公开着陆页，包含分类索引
- `.github/ISSUE_TEMPLATE/bury-my-project.yml` — Issue 模板（字段标题不可更改）
- `.github/workflows/` — GitHub Actions 工作流（Issue close 触发）
- `scripts/process_submission.js` — 归档自动化脚本（Node.js）

## Skills

- `/bury-my-project` — 输入 GitHub repo URL，自动分析项目、生成尸检报告（愿景/技术栈/死亡笔记/墓志铭）并提交 Issue。分类：Stillborn / Beautiful-Junk / AI-Hallucination / Market-Fail。

## 测试

修改 `process_submission.js` 后运行测试：
```bash
node scripts/test-runner.js act-issue-closed-approved.json   # 正常归档
node scripts/test-runner.js act-issue-closed-invalid.json  # 缺失字段
node scripts/test-runner.js act-issue-closed-duplicate.json # 重复提交
```
详见 `@act.md`。

## 备注

- 四个分类目录各有 2 个示例墓碑文件（用于展示格式），提交新墓碑时格式须保持一致
- `.history/`、测试 fixtures（`act-*.json`）、`.env.test`、`node_modules/` 已被 gitignore

