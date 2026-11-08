'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const POSTS_DIR = path.resolve(__dirname, '..', 'source', '_posts');
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const DATE_IN_FILENAME = /^.?(\d{4})[-_]?(\d{2})[-_]?(\d{2}).?[-_.@# ]*(.*)$/;

function walk(dir, files) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function titleFromFilename(file) {
  const base = path.basename(file, path.extname(file));
  const match = base.match(DATE_IN_FILENAME);
  return (match ? match[4] : base).trim();
}

function validDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function dateFromFilename(file) {
  const base = path.basename(file, path.extname(file));
  const match = base.match(DATE_IN_FILENAME);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!validDate(year, month, day)) return null;

  return new Date(year, month - 1, day);
}

function parseFrontMatterDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value.trim().replace(' ', 'T'));
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function isTagValueValid(value) {
  if (value == null) return true;
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) {
    return value.every(item => typeof item === 'string'
      || (item && typeof item === 'object' && typeof item.name === 'string'));
  }
  return value && typeof value === 'object' && typeof value.name === 'string';
}

function validateFile(file) {
  const errors = [];
  let source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  let data = {};

  if (FRONT_MATTER.test(source)) {
    const raw = source.match(FRONT_MATTER)[1];
    try {
      const parsed = yaml.load(raw);
      if (parsed != null && (typeof parsed !== 'object' || Array.isArray(parsed))) {
        errors.push('front-matter 必须是一组 key: value 字段，而不是列表或单个值');
      } else if (parsed) {
        data = parsed;
      }
    } catch (error) {
      errors.push(`front-matter YAML 解析失败：${error.message.split('\n')[0]}`);
      return errors;
    }
  }

  const title = typeof data.title === 'string'
    ? data.title.trim()
    : (data.title == null ? '' : String(data.title).trim());

  if (!title && !titleFromFilename(file)) {
    errors.push('标题为空：请把文件名写成「日期-标题.md」，例如 2026-11-08-我的日记.md，或在 front-matter 中填写 title');
  }

  let date = parseFrontMatterDate(data.date);

  if (data.date != null && !date) {
    errors.push(`date 无法解析：${JSON.stringify(data.date)}，请使用 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss`);
  }

  if (!date) {
    date = dateFromFilename(file);
  }

  if (!date) {
    errors.push('缺少日期：请在文件名前加日期（例如 2026-11-08-我的日记.md），或在 front-matter 中填写 date');
  }

  for (const field of ['tags', 'categories']) {
    if (!isTagValueValid(data[field])) {
      errors.push(`${field} 格式不正确：应为字符串、字符串数组，或 { name: ... } 的数组`);
    }
  }

  return errors;
}

const files = walk(POSTS_DIR, []).sort();
const failures = [];

for (const file of files) {
  const errors = validateFile(file);
  if (errors.length) {
    failures.push({ file: path.relative(process.cwd(), file), errors });
  }
}

if (failures.length) {
  console.error(`\n发现 ${failures.length} 篇文章存在 front-matter 问题：\n`);
  for (const failure of failures) {
    console.error(`- ${failure.file}`);
    for (const error of failure.errors) {
      console.error(`    ${error}`);
    }
  }
  console.error(`\n共检查 ${files.length} 篇文章，构建已中止。\n`);
  process.exit(1);
}

console.log(`front-matter 校验通过，共检查 ${files.length} 篇文章。`);
