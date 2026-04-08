# 本地测试：使用 act + test-runner 验证脚本

## 概述

由于网络限制（无法拉取 Docker 镜像），本地测试采用 **Node.js test-runner** 方案：
- `scripts/test-runner.js` — 读取 event fixture，注入模拟环境变量，直接运行 `process_submission.js`
- 无需 Docker，直接用 Node.js 执行，完整验证业务逻辑

## 前置要求

- Node.js 18+
- Git（用于 git 操作）
- `gh` 已登录：`gh auth login`

## 运行命令

```bash
# 运行特定场景
node scripts/test-runner.js act-issue-closed-approved.json   # 正常归档
node scripts/test-runner.js act-issue-closed-invalid.json    # 缺失字段
node scripts/test-runner.js act-issue-closed-duplicate.json   # 重复提交
```

> 注意：`act-issue-closed-no-label.json` 需通过 GitHub Actions workflow 验证（label 检查在 workflow 层）

## 测试场景 fixtures

| 文件 | 场景 |
|------|------|
| `act-issue-closed-approved.json` | Issue 有 `approved` 标签，正常归档 |
| `act-issue-closed-invalid.json` | 必填字段缺失，打 `invalid` + comment |
| `act-issue-closed-duplicate.json` | URL 重复，打 `duplicate` + comment |
| `act-issue-closed-no-label.json` | 无 `approved` 标签，workflow 层静默跳过 |

## 工作原理

```
test-runner.js
  → 读取 act-*.json（模拟 GitHub event）
  → 设置环境变量（GITHUB_TOKEN, ISSUE_NUMBER, ISSUE_BODY 等）
  → 运行 process_submission.js
  → process_submission.js 识别 ACT=true，进入测试模式
  → GitHub API 调用和 git push 被 mock（打印日志，不实际执行）
  → 验证文件生成和 README 更新结果
```

## 验证结果

运行后检查：
1. **墓碑文件**是否在正确目录生成：`Beautiful-Junk/test-approved-project.md`
2. **README 索引**是否正确插入（在分类表格 `|---|---|---|` 之后）
3. **退出码**是否符合预期（错误场景应 exit 1）

```bash
# 检查墓碑文件
ls Beautiful-Junk/test-approved-project.md

# 检查 README 插入结果
grep -A2 "test-approved" README.md

# 检查 Git 操作日志（应显示跳过）
```

## Git 操作验证

测试模式（`ACT=true`）下 git 操作被跳过，会打印应执行的命令：

```
[TEST] Git 操作已跳过（ACT=true）
[TEST] 应执行: git add -A && git commit -m "feat: add ..." && git push
```

如需验证完整 git 操作（会写入本地 .git），使用：

```bash
# 在测试分支上运行
git checkout -b act-test
node scripts/test-runner.js act-issue-closed-approved.json
git log --oneline -3   # 查看 commit
git reset --hard HEAD~1 # 测试完成后回滚
git checkout main && git branch -D act-test
```

## 添加新测试场景

1. 复制 `.github/ISSUE_TEMPLATE/bury-my-project.yml` 作为参考
2. 在 `act-*.json` 中构造 Issue body，确保包含完整的 `## 字段名\n\n内容` 格式
3. 关键字段：
   - `issue.labels` — 决定触发哪条逻辑
   - `issue.body` — 决定解析结果
   - `issue.user.login` — 成为 README 中的提交人

## 网络问题解决（备选：使用 act）

如果 Docker Hub 可达，可改用 `act` 完整模拟：

```bash
# 安装 act
brew install act

# act 配置（.actrc）
-P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full
--container-daemon-socket /Users/lixuejiang/.orbstack/run/docker.sock

# 运行
act issues -e act-issue-closed-approved.json
```
