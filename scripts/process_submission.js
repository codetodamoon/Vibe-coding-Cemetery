#!/usr/bin/env node

/**
 * process_submission.js
 *
 * 当 Issue 被关闭且带有 approved 标签时，自动归档墓碑文件并更新 README。
 *
 * 环境变量（由 GitHub Actions 注入）：
 *   GITHUB_TOKEN       — GitHub API token
 *   ISSUE_NUMBER       — Issue 编号
 *   ISSUE_BODY         — Issue 正文
 *   ISSUE_USER         — Issue 创建者用户名
 *   ISSUE_TITLE        — Issue 标题
 *   GITHUB_REPOSITORY  — 仓库 owner/repo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── 配置 ───────────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const ISSUE_BODY = process.env.ISSUE_BODY || '';
const ISSUE_USER = process.env.ISSUE_USER || 'unknown';
const ISSUE_TITLE = process.env.ISSUE_TITLE || '';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '';

// Issue body 二级标题 → 字段名映射（精确匹配标题文字）
const FIELD_LABELS = {
  '项目名称': 'projectName',
  '归属分类': 'category',
  '当初的幻觉 (Vision)': 'vision',
  '死亡原因 (Cause of Death)': 'deathCause',
  '技术栈': 'techStack',
  '项目链接（可选）': 'projectLink',
  '墓志铭（可选）': 'epitaph',
};

// 归属分类 → 目录名（匹配下拉选项中的关键词）
const CATEGORY_MAP = {
  'stillborn': 'Stillborn',
  'beautiful junk': 'Beautiful-Junk',
  'ai hallucination': 'AI-Hallucination',
  'market fail': 'Market-Fail',
};

const LABELS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  AUTO_GENERATED: 'auto-generated',
  INVALID: 'invalid',
  DUPLICATE: 'duplicate',
};

// ─── 工具函数 ───────────────────────────────────────────────────────────

/**
 * 从 Issue body 中提取字段。
 * GitHub 表单生成的是三级标题 ### 格式，提取每个字段的值。
 */
function parseIssueBody(body) {
  const fields = {};
  const sections = body.split(/(?=^###\s)/m);

  for (const section of sections) {
    const match = section.match(/^###\s+(.+?)\n+([\s\S]*?)(?=\n###|\n*$)/);
    if (!match) continue;

    const label = match[1].trim();
    const value = match[2].trim();

    if (FIELD_LABELS[label] !== undefined && value) {
      fields[FIELD_LABELS[label]] = value;
    }
  }

  return fields;
}

/**
 * 验证必填字段。
 * @returns {string[]} 缺失的字段名列表
 */
function getMissingFields(fields) {
  const required = ['projectName', 'category', 'vision', 'deathCause', 'techStack'];
  return required.filter((f) => !fields[f] || !fields[f].trim());
}

/**
 * 从归属分类选项文字中提取目录名。
 * @param {string} categoryOption - 下拉选项的完整文字，如 "💎 美丽废物 (Beautiful Junk) — 代码完整，但没人用"
 * @returns {string|null} 目录名或 null（无效分类）
 */
function mapCategory(categoryOption) {
  if (!categoryOption) return null;
  const lower = categoryOption.toLowerCase();
  for (const [keyword, dir] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      return dir;
    }
  }
  return null;
}

/**
 * 从项目名称生成文件名 slug。
 * 支持中文字符：
 * "测试" → "ce-shi.md"
 * "测试AI项目" → "ce-shi-ai-xiang-mu.md"
 * "Vibe-Pet-GPT" → "vibe-pet-gpt.md"
 */
function generateFilename(projectName) {
  // 使用 pinyin 库将中文转为拼音（fallback 到字符码）
  let slug;
  try {
    const pinyin = require('pinyin').default;
    const pinyins = pinyin(projectName, { style: pinyin.STYLE_NORMAL });
    slug = pinyins.map(p => p[0]).join('-');
  } catch {
    // Fallback: 保留 Unicode 字母数字，替换其他字符为 -
    slug = projectName
      .replace(/[^\w]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  // 最后再规范化一遍（移除连续 - 和首尾 -）
  return slug.toLowerCase().replace(/-+/g, '-').replace(/^-+|-+$/g, '') + '.md';
}

/**
 * 扫描已有墓碑文件，检查是否有重复。
 * @param {string} projectLink - 项目链接（URL）
 * @param {string} filename - 生成的文件名
 * @param {string} categoryDir - 分类目录
 * @returns {boolean} true = 重复
 */
function isDuplicate(projectLink, filename, categoryDir) {
  const categoryPath = path.join(__dirname, '..', categoryDir);

  if (!fs.existsSync(categoryPath)) return false;

  const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith('.md'));

  // 1. 如果有 URL，按 URL 查重（扫描所有分类目录）
  if (projectLink) {
    const normalizedLink = projectLink.trim().replace(/\/$/, '');
    for (const catDir of Object.values(CATEGORY_MAP)) {
      const catPath = path.join(__dirname, '..', catDir);
      if (!fs.existsSync(catPath)) continue;
      for (const file of fs.readdirSync(catPath).filter((f) => f.endsWith('.md'))) {
        const content = fs.readFileSync(path.join(catPath, file), 'utf8');
        if (content.includes(normalizedLink)) {
          return true;
        }
      }
    }
    return false;
  }

  // 2. 无 URL，按文件名在本分类目录查重
  return files.includes(filename);
}

/**
 * 生成墓碑文件内容。
 */
function generateBurialContent(fields, filename, categoryDir, issueNumber) {
  const projectName = fields.projectName.trim();
  const vision = fields.vision ? fields.vision.trim() : '';
  const techStack = fields.techStack ? fields.techStack.trim() : '';
  const deathCause = fields.deathCause ? fields.deathCause.trim() : '';
  const epitaph = fields.epitaph ? fields.epitaph.trim() : '';
  const projectLink = fields.projectLink ? fields.projectLink.trim() : '';
  const repoUrl = `https://github.com/${GITHUB_REPOSITORY}`;
  const issueUrl = `${repoUrl}/issues/${issueNumber}`;

  let content = `# ${projectName}\n\n`;
  content += `## 愿景\n${vision}\n\n`;
  content += `## 技术栈\n${techStack}\n\n`;
  content += `## 死亡笔记\n${deathCause}\n`;

  if (epitaph) {
    content += `\n## 墓志铭\n${epitaph}\n`;
  }

  const sourceParts = [];
  if (projectLink) {
    sourceParts.push(`[原始仓库](${projectLink})`);
  }
  sourceParts.push(`[原始 Issue](${issueUrl})`);
  content += `\n## 来源\n${sourceParts.join(' | ')}\n`;

  return content;
}

/**
 * 用正则精确替换 README.md，在对应分类表格末尾插入一行。
 *
 * 定位策略：
 * 1. 定位分类章节标题（精确匹配整行）
 * 2. 在该章节内找分隔行 |---|---|---|
 * 3. 在分隔行之后插入新行
 *
 * @param {string} readmeContent - README 原文
 * @param {string} categoryDir - 分类目录名（如 "Beautiful-Junk"）
 * @param {string} projectName - 项目名称
 * @param {string} filename - 生成的文件名
 * @param {string} deathNote - 死亡笔记摘要（截取前50字）
 * @param {string} submitter - 提交人
 * @returns {string} 更新后的 README 内容
 */
function updateReadmeIndex(
  readmeContent,
  categoryDir,
  projectName,
  filename,
  deathNote,
  submitter
) {
  const categoryHeaderMap = {
    'Stillborn': '### 🐣 Stillborn',
    'Beautiful-Junk': '### 💎 Beautiful Junk',
    'AI-Hallucination': '### 🌀 AI Hallucination',
    'Market-Fail': '### 📉 Market Fail',
  };

  const sectionHeader = categoryHeaderMap[categoryDir];
  if (!sectionHeader) {
    throw new Error(`未知的分类目录: ${categoryDir}`);
  }

  // 死亡笔记截取前 50 字
  const deathNoteShort =
    deathNote.length > 50 ? deathNote.slice(0, 50) + '…' : deathNote;

  const newRow = `| [${projectName}](./${categoryDir}/${filename}) | ${deathNoteShort} | @${submitter} |\n`;

  // 步骤 1：定位分类章节整行（用换行符精确匹配，避免部分匹配）
  const sectionHeaderWithNewline = sectionHeader + '\n';
  const sectionStartIdx = readmeContent.indexOf(sectionHeaderWithNewline);
  if (sectionStartIdx === -1) {
    throw new Error(`未找到分类标题 "${sectionHeader}"，README 结构可能被修改`);
  }

  // 步骤 2：在该章节之后，找下一个 ### 标题之前的内容中定位分隔行
  const afterSection = readmeContent.slice(sectionStartIdx);
  const nextSectionMatch = afterSection.match(/\n###\s /);
  const sectionEndIdx = nextSectionMatch
    ? sectionStartIdx + nextSectionMatch.index
    : readmeContent.length;
  const sectionContent = readmeContent.slice(sectionStartIdx, sectionEndIdx);

  // 分隔行格式固定 |---|---|---|（3列）
  const sepRow = '|---|---|---|';
  const sepRowIdx = sectionContent.indexOf(sepRow);
  if (sepRowIdx === -1) {
    throw new Error(`未找到 ${categoryDir} 分类的表格分隔行，README 结构可能被修改`);
  }

  // 步骤 3：插到分隔行之后（跳过分隔行的 \n）
  const insertIdx = sectionStartIdx + sepRowIdx + sepRow.length;
  const before = readmeContent.slice(0, insertIdx + 1); // +1 跳过 sepRow 的 \n
  const after = readmeContent.slice(insertIdx + 1);

  return before + newRow + after;
}

// ─── Git 操作 ───────────────────────────────────────────────────────────

function gitCommitAndPush(message) {
  if (IS_TEST) {
    console.log(`[TEST] Git 操作已跳过（ACT=true）`);
    console.log(`[TEST] 应执行: git add -A && git commit -m "${message}" && git push`);
    return;
  }

  const repoPath = path.join(__dirname, '..');
  execSync('git config user.name "GitHub Actions Bot"', { cwd: repoPath });
  execSync('git config user.email "actions@github.com"', { cwd: repoPath });
  execSync('git add -A', { cwd: repoPath });

  const status = execSync('git status --porcelain', { cwd: repoPath })
    .toString()
    .trim();
  if (!status) {
    console.log('没有文件变更，无需提交。');
    return;
  }

  execSync(`git commit -m "${message}"`, { cwd: repoPath });
  console.log(`Commit: ${message}`);
  execSync('git push', { cwd: repoPath });
  console.log('Push 完成。');
}

// ─── GitHub API 操作 ────────────────────────────────────────────────────

/**
 * 给 Issue 打标签。
 */
// 测试模式（ACT=true）：跳过 GitHub API 调用
const IS_TEST = process.env.ACT === 'true' || process.env.ACT === true;

async function addLabel(label) {
  if (IS_TEST) {
    console.log(`[TEST] 打标签: ${label}`);
    return;
  }
  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/labels`;
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ labels: [label] }),
  });
}

/**
 * 发 Comment 到 Issue。
 */
async function addComment(body) {
  if (IS_TEST) {
    console.log(`[TEST] 发 comment: ${body.slice(0, 80)}...`);
    return;
  }
  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Comment 失败: ${res.status} ${errText}`);
  }
}

// ─── 主流程 ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`[Bury] 开始处理 Issue #${ISSUE_NUMBER}`);
  console.log(`[Bury] 提交者: @${ISSUE_USER}`);

  // Step 1: 解析 Issue body
  const fields = parseIssueBody(ISSUE_BODY);
  console.log('[Bury] 解析字段:', Object.keys(fields).join(', '));

  // Step 2: 验证必填字段
  const missingFields = getMissingFields(fields);
  if (missingFields.length > 0) {
    const msg =
      `❌ 归档失败：缺少必填字段 [${missingFields.join(', ')}]。\n` +
      `请检查 Issue 内容是否符合模板要求。`;
    console.error(`[Bury] ${msg}`);
    await addLabel(LABELS.INVALID);
    await addComment(msg);
    process.exit(1);
  }

  // Step 3: 解析分类
  const categoryDir = mapCategory(fields.category);
  if (!categoryDir) {
    const msg =
      `❌ 归档失败：无法识别归属分类 [${fields.category}]。\n` +
      `请确保从下拉菜单中选择分类，而非手动输入。`;
    console.error(`[Bury] ${msg}`);
    await addLabel(LABELS.INVALID);
    await addComment(msg);
    process.exit(1);
  }
  console.log(`[Bury] 分类: ${categoryDir}`);

  // Step 4: 生成文件名
  const filename = generateFilename(fields.projectName);
  console.log(`[Bury] 文件名: ${filename}`);

  // Step 5: 检查重复
  if (isDuplicate(fields.projectLink, filename, categoryDir)) {
    const msg =
      `❌ 归档失败：该项目（${fields.projectLink || fields.projectName}）已在墓园中存在，不接受重复埋葬。`;
    console.error(`[Bury] ${msg}`);
    await addLabel(LABELS.DUPLICATE);
    await addComment(msg);
    process.exit(1);
  }

  // Step 6: 生成墓碑文件
  const burialContent = generateBurialContent(fields, filename, categoryDir, ISSUE_NUMBER);
  const burialPath = path.join(__dirname, '..', categoryDir, filename);
  fs.writeFileSync(burialPath, burialContent, 'utf8');
  console.log(`[Bury] 生成墓碑: ${burialPath}`);

  // Step 7: 更新 README 索引
  const readmePath = path.join(__dirname, '..', 'README.md');
  let readmeContent = fs.readFileSync(readmePath, 'utf8');
  readmeContent = updateReadmeIndex(
    readmeContent,
    categoryDir,
    fields.projectName,
    filename,
    fields.deathCause.trim(),
    ISSUE_USER
  );
  fs.writeFileSync(readmePath, readmeContent, 'utf8');
  console.log('[Bury] README 索引已更新');

  // Step 8: Commit & Push
  const commitMsg = `feat: add ${fields.projectName} to ${categoryDir}`;
  gitCommitAndPush(commitMsg);

  // Step 9: 打 auto-generated 标签
  // 注意：auto-generated 由 /bury-my-project skill 提交时打，
  // 这里仅在成功归档后标记归档完成（标签已存在则忽略）
  try {
    await addLabel(LABELS.AUTO_GENERATED);
  } catch {
    // 标签已存在，忽略
  }

  console.log(`[Bury] Issue #${ISSUE_NUMBER} 归档完成。`);
}

main().catch(async (err) => {
  console.error('[Bury] 内部错误:', err.message);
  process.exit(1);
});
