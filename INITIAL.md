
# Project Strategy: Vibe-coding-Cemetery

## FEATURE:
建立一个名为 "Vibe-coding-Cemetery" 的 GitHub 仓库，用于记录在 AI 辅助开发（Vibe Coding）浪潮中失败、流产或无用的项目。

**核心功能自动化流程：**
1. **Issue 提交机制：** 贡献者根据 `.github/ISSUE_TEMPLATE/bury-my-project.yml` 提交 Issue（需填写尸检报告）。
2. **审核机制：** Maintainer 审核 Issue 内容，通过后打上 `approved` 标签并关闭 Issue。
3. **触发归档：** Issue 被关闭时触发 GitHub Action，检查是否同时带有 `approved` 标签，有则归档，无则静默退出。
4. **文件自动生成：** 脚本解析 Issue 内容，在对应的分类目录（Stillborn, Beautiful-Junk, AI-Hallucination, Market-Fail）下生成一个新的 `.md` 详情文件。
5. **索引自动更新：** 脚本用 Node.js 正则精确替换，在根目录 `README.md` 对应分类表格末尾插入一行。
6. **Commit & Push：** 脚本将生成的文件和更新后的 README 一并 commit 并 push 回仓库。

**Issue 模板字段（字段标题即脚本解析 key，不可更改）：**

| 字段标题 | 规则 |
|------|------|
| `项目名称` | 必填 |
| `归属分类` | 必填，下拉选择 |
| `当初的幻觉 (Vision)` | 必填 |
| `死亡原因 (Cause of Death)` | 必填 |
| `技术栈` | 必填 |
| `项目链接（可选）` | 选填 |
| `墓志铭（可选）` | 选填 |

**⚠️ 字段标题一旦上线不可修改，否则旧 Issue 将解析失败。**

## LABEL 体系:

| 标签 | 触发时机 | 含义 |
|------|---------|------|
| `pending` | Issue 创建时（模板默认） | 等待 maintainer 审核 |
| `approved` | Maintainer 手动打 | 审核通过，close 时触发归档 |
| `auto-generated` | `/bury-my-project` skill 提交时自动打 | 区分 AI 提交 vs 人工提交 |
| `duplicate` | 脚本检测到重复时打 | 同一 repo URL 已存在，comment 通知贡献者 |
| `invalid` | 脚本检测到提交问题时打 | 必填字段缺失或分类无效，comment 通知贡献者 |

## EXAMPLES:

### 1. 贡献者提交流程:
1. 贡献者点击 **New Issue** → 选择 **Bury My Project** 模板
2. 填写尸检报告（项目名、分类、愿景、死亡原因、技术栈等）
3. 提交 Issue，等待 maintainer 审核

### 2. Maintainer 审核流程:
1. 检查 Issue 内容是否符合墓园调性（拒绝恶意/无意义提交）
2. 确认分类是否合理（可修改分类标签）
3. 打上 `approved` 标签
4. 关闭 Issue（Close）—— `approved` 标签必须在 close 时已存在

### 3. 自动归档流程（Issue Close 触发）:
```
Issue Close
    ↓
检查 approved 标签 → 无标签 → 静默退出（跳过）
    ↓ 有标签
解析 Issue body（二级标题 ## 分隔字段）
    ↓
检查必填字段 → 缺失 → 打 invalid 标签 + comment 告知贡献者缺哪个字段 → 报错退出（通知 maintainer）
    ↓ 字段完整
解析归属分类 → 无效分类 → 打 invalid 标签 + comment 告知贡献者 → 报错退出（通知 maintainer）
    ↓ 分类有效
检查重复：有项目链接 → 按 URL 查重；无项目链接 → 按文件名查重
    ↓ 有重复 → 打 duplicate 标签 + comment 告知贡献者 → 退出
    ↓ 无重复
生成墓碑 .md 文件（写入分类目录）
    ↓
用正则更新 README.md（在对应分类表格末尾插入一行）
    ↓
Commit + Push（GITHUB_TOKEN，防循环条件：if: github.repository == 'owner/repo'）
    ↓
完成
```

**错误通知策略：**
- **提交问题**（字段缺失、分类无效、重复提交）：打标签 + comment，贡献者和 maintainer 都能看到
- **代码内部错误**（push 失败、脚本异常等）：仅在 GitHub Actions Job Summary 中记录，由 maintainer 在 Actions 页面查看

### 4. Generated File Example (`Beautiful-Junk/vibe-pet-gpt.md`):
```markdown
# Vibe-Pet-GPT

## 愿景
做一个能跟猫说话的 AI

## 技术栈
Next.js + Claude API

## 死亡笔记
猫根本不理 AI，模型还幻觉出了一个不存在的 API，调试三小时后放弃。

## 墓志铭
RIP，猫永远是老板。

## 来源
[原始仓库](https://github.com/...) | [原始 Issue](#)
```

### 5. README Update Example:

在 `### 💎 Beautiful Junk` 表格的 `|---|---|---|` 行之后插入（Node.js 正则替换）：

```markdown
| [Vibe-Pet-GPT](./Beautiful-Junk/vibe-pet-gpt.md) | 猫根本不理 AI... | @username |
```

## 文件名生成规则:

```
"Vibe-Pet-GPT"        → vibe-pet-gpt.md
"My Cool Project 2.0" → my-cool-project-2-0.md
```

规则：全小写 → 非字母数字替换为连字符 → 多个连字符合并 → 首尾连字符去掉。

**重复检查：**
- 有项目链接（URL）→ 扫描所有已有 `.md` 文件的 `## 来源` 字段，按 URL 查重
- 无项目链接 → 按生成的文件名查重

## 分类映射关系（脚本内硬编码）:

| Issue 下拉选项（匹配关键词） | 目录名 |
|---|---|
| `Stillborn` | `Stillborn` |
| `Beautiful Junk` | `Beautiful-Junk` |
| `AI Hallucination` | `AI-Hallucination` |
| `Market Fail` | `Market-Fail` |

## SKILL: /bury-my-project

提供了一个 Claude Code Skill（`.claude/skills/bury-my-project/SKILL.md`），输入一个 GitHub repo URL 即可自动完成整个提交流程：

1. **分析目标仓库** — 读取 README、源码、issues 等，判断项目类型
2. **判断归属分类** — 根据分析结果归入 Stillborn / Beautiful-Junk / AI-Hallucination / Market-Fail
3. **生成尸检报告** — 输出符合 Issue 模板的内容（愿景、技术栈、死亡笔记、墓志铭）
4. **直接提交 Issue** — 无需 Fork，在本仓库创建 Issue，自动打 `auto-generated` 标签

**使用方式：**
```
/bury-my-project https://github.com/user/failed-repo
```

**设计原则：**
- 生成内容先展示给用户确认，再提交 Issue
- 分类不确定时主动询问用户
- 墓志铭力求幽默、真实、有共鸣

## DOCUMENTATION:

  - **GitHub Actions:** `on: issues: types: [closed]`，用 `if: contains(github.event.issue.labels.*.name, 'approved')` 检查标签，用 `if: github.repository == 'owner/repo'` 防止循环触发。
  - **JavaScript Regex:** 用于从 Issue Body 中提取 `## 字段标题` 分隔的内容，以及用于 README 表格的精确插入。
  - **GitHub REST API / `gh` CLI:** 用于给 Issue 打标签、发 comment。
  - **GITHUB_TOKEN:** 用于 commit & push，需在仓库设置中开启 Read and write permissions。

## OTHER CONSIDERATIONS:

  - **字段解析格式：** Issue body 使用二级标题（`##`）分隔字段，正则按 `## 字段名\n\n内容` 格式提取。
  - **健壮性：** 选填字段（墓志铭、项目链接）缺失不影响流程，生成文件时跳过对应章节。
  - **README 锚点：** 每个分类表格下方必须有 `|---|---|---|` 分隔行，脚本以此为插入锚点（正则匹配该行 + 分类名确定位置）。
  - **权限：** 仓库设置中需开启 `GITHUB_TOKEN` 的 Read and write permissions，否则 Workflow 无法 push。
  - **仅支持 GitHub：** 不支持 GitLab、Bitbucket 等其他平台的仓库链接。
