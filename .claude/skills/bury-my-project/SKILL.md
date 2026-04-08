---
name: bury-my-project
description: "输入一个 GitHub repo URL，自动分析该项目、生成符合 Vibe-coding-Cemetery 的 Issue 内容并提交 Issue。适合贡献者使用 /bury-my-project 快速埋葬自己的失败项目。"
---

# Bury My Project

给定一个 GitHub 仓库 URL，自动完成以下步骤：

1. **克隆并分析**该仓库，了解项目名称、技术栈、失败原因（如 README、issues 中有线索）
2. **判断归属分类**（Stillborn / Beautiful-Junk / AI-Hallucination / Market-Fail）
3. **生成尸检报告**内容（标题、愿景、死亡原因、墓志铭）
4. **直接提交 Issue** 到 Vibe-coding-Cemetery（无需 Fork）

## 输入

用户传入参数格式：`$ARGUMENTS` 为 GitHub repo URL，例如 `https://github.com/user/failed-project`

## 执行步骤

### Step 1: 分析目标仓库

使用 Agent 工具（Explore subagent）克隆并分析目标仓库：

- 读取 README.md — 了解项目愿景和功能描述
- 读取主要源码文件（package.json、Cargo.toml、pyproject.toml 等）— 确定技术栈
- 扫描 issues / PR — 寻找失败原因和遗留问题的线索
- 查看最近 commits 和代码状态 — 判断项目是中途废弃还是完成后失败

**判断分类：**
- **Stillborn**：进度 < 10%，README 很宏大但代码寥寥无几
- **Beautiful-Junk**：代码完整，但 README 中透露出"不知道给谁用"
- **AI-Hallucination**：issues 或 commits 中有大量 API 不存在、逻辑错误的抱怨
- **Market-Fail**：README 功能完整，但明显是伪需求或没有用户

### Step 2: 生成尸检报告（Issue 内容）

根据分析结果，生成符合 Issue 模板格式的内容：

```markdown
## 项目名称
{项目名}

## 归属分类
{分类名（下拉选项文字）}

## 当初的幻觉 (Vision)
{一句话描述当初想做什么}

## 死亡原因 (Cause of Death)
{详细的尸检报告：失败原因、发现的问题、放弃的契机}

## 技术栈
{列出主要技术/AI 模型}

## 项目链接（可选）
{原始仓库 URL}

## 墓志铭（可选）
{一句幽默或深刻的总结}
```

**分类选项（必须与 Issue 模板下拉选项一致）：**
- 🐣 胎死腹中 (Stillborn) — 进度 < 10%，README 宏大但代码寥寥无几
- 💎 美丽废物 (Beautiful Junk) — 代码完整，但没人用/不知道给谁用
- 🌀 智障 AI (AI Hallucination) — 被 AI 的幻觉 API/逻辑坑了
- 📉 商业幻觉 (Market Fail) — 产品完美，但市场不需要

### Step 3: 提交 Issue

用 `gh issue create` 在 Vibe-coding-Cemetery 仓库创建 Issue，同时打上 `auto-generated` 标签：

```bash
gh issue create \
  --repo Vibe-coding-Cemetery \
  --title "🪦 Bury: {项目名}" \
  --body "$(cat <<'EOF'
## 项目名称
{项目名}

## 归属分类
{分类名（下拉选项文字）}

## 当初的幻觉 (Vision)
{愿景}

## 死亡原因 (Cause of Death)
{死亡笔记摘要}

## 技术栈
{技术栈}

## 项目链接（可选）
{原始仓库 URL}

## 墓志铭（可选）
{墓志铭}

---
*由 /bury-my-project 自动生成*
EOF
)" \
  --label "auto-generated"
```

> 注意：`--repo` 省略 owner 时默认使用当前 gh 登录账号的仓库。

## 注意事项

- **用户确认后再提交：** 生成内容后，先展示给用户看，确认无误再提交 Issue
- **分类不确定时询问用户：** 如果分类模糊，主动询问用户更倾向哪个分类
- **墓志铭要有特色：** 墓志铭是整个条目的灵魂，力求幽默、真实、有共鸣
- **Repo URL 支持多种格式：** 支持 `github.com/user/repo`、`user/repo`、`https://github.com/user/repo`
- **礼貌提示：** 提醒用户 Issue 被关闭后系统会自动更新索引，无需手动操作
