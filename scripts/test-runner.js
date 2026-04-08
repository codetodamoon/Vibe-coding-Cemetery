#!/usr/bin/env node

/**
 * test-runner.js
 *
 * 本地测试运行器，模拟 GitHub Actions 环境运行 process_submission.js。
 * 无需 Docker，直接用 Node.js 执行。
 *
 * 用法：
 *   node scripts/test-runner.js act-issue-closed-approved.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const eventFile = process.argv[2];
if (!eventFile) {
  console.error('用法: node scripts/test-runner.js <event.json>');
  process.exit(1);
}

const eventPath = path.resolve(eventFile);
if (!fs.existsSync(eventPath)) {
  console.error(`文件不存在: ${eventPath}`);
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));

// 模拟 GitHub Actions 环境变量
const env = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || 'ghp_test_fake_token',
  GITHUB_REPOSITORY: 'your-username/Vibe-coding-Cemetery',
  ISSUE_NUMBER: String(event.issue.number),
  ISSUE_BODY: event.issue.body || '',
  ISSUE_USER: event.issue.user?.login || 'test-user',
  ISSUE_TITLE: event.issue.title || '',
  // act 本地测试标识（process_submission.js 可以检测到这个）
  ACT: 'true',
};

console.log('=== 测试运行器 ===');
console.log(`场景: ${path.basename(eventFile)}`);
console.log(`Issue: #${env.ISSUE_NUMBER} @${env.ISSUE_USER}`);
console.log(`Labels: [${(event.issue.labels || []).map((l) => l.name).join(', ')}]`);
console.log('');

// 临时写入环境变量到 .env 文件，process_submission.js 可读取
const envPath = path.join(__dirname, '..', '.env.test');
const envLines = Object.entries(env)
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');
fs.writeFileSync(envPath, envLines, 'utf8');

console.log('--- 运行 process_submission.js ---\n');

try {
  const result = execSync(
    `node ${path.join(__dirname, 'process_submission.js')}`,
    {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: 'inherit',
    }
  );
  console.log('\n--- 运行成功 ---');
  process.exit(0);
} catch (err) {
  console.log('\n--- 运行失败（预期行为）---');
  console.log(`退出码: ${err.status}`);
  process.exit(err.status || 1);
} finally {
  fs.unlinkSync(envPath);
}
