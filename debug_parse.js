const body = `### 项目名称

测试

### 归属分类

📉 商业幻觉 (Market Fail) — 产品完美，但市场不需要

### 当初的幻觉 (Vision)

让AI自动套利赚钱

### 死亡原因 (Cause of Death)

根本不赚钱

### 技术栈

nodejs

### 项目链接（可选）

https://github.com/codetodamoon/arbitrage-monitor

### 墓志铭（可选）

什么时候能赚钱`;

const FIELD_LABELS = {
  '项目名称': 'projectName',
  '归属分类': 'category',
  '当初的幻觉 (Vision)': 'vision',
  '死亡原因 (Cause of Death)': 'deathCause',
  '技术栈': 'techStack',
  '项目链接（可选）': 'projectLink',
  '墓志铭（可选）': 'epitaph',
};

console.log('=== Split 结果 ===');
const sections = body.split(/(?=^###\s)/m);
sections.forEach((s, i) => console.log(`[${i}] len=${s.length} start=${s.slice(0,50).replace(/\n/g,'↵')}`));

console.log('\n=== 解析结果 ===');
const fields = {};
for (const section of sections) {
  const match = section.match(/^###\s+(.+?)\n+([\s\S]*?)(?=\n###|\n*$)/);
  if (!match) { console.log('NO MATCH:', section.slice(0,50)); continue; }
  const label = match[1].trim();
  const value = match[2].trim();
  if (FIELD_LABELS[label] !== undefined && value) {
    fields[FIELD_LABELS[label]] = value;
  }
  console.log('OK:', label, '->', value.slice(0,30));
}
console.log('\n最终字段:', fields);
