const fs = require('fs');
const path = require('path');
const { iconHeadTags } = require('./generate-icons');

const PAGES = [
  'index.html',
  'slip/index.html',
  'privacy/index.html',
  'confirm/index.html',
  'reset/index.html',
];

describe('iconHeadTags', () => {
  test('every page <head> includes the full favicon/manifest tag block', () => {
    const tags = iconHeadTags();
    const missing = PAGES.filter((page) => {
      const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
      return !html.includes(tags);
    });

    expect(missing).toEqual([]);
  });
});
