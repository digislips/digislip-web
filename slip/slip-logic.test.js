const { parseSlipResponse, getSlipId, buildTextSegments, extractBarcodesFromText } = require('./slip-logic');

describe('parseSlipResponse', () => {
  test('auth error via code field shows error, not garbage receipt', () => {
    const result = parseSlipResponse({
      code: 'UNAUTHORIZED_NO_AUTH_HEADER',
      message: 'Missing authorization header',
    });
    expect(result.type).toBe('error');
    expect(result.message).toBe('Missing authorization header');
  });

  test('not_found via error field', () => {
    expect(parseSlipResponse({ error: 'not_found' }).type).toBe('not_found');
  });

  test('not_found via code field', () => {
    expect(parseSlipResponse({ code: 'not_found' }).type).toBe('not_found');
  });

  test('other error via error field', () => {
    const result = parseSlipResponse({ error: 'internal_error' });
    expect(result.type).toBe('error');
    expect(result.message).toBe('internal_error');
  });

  test('empty object — missing created_at — returns error', () => {
    const result = parseSlipResponse({});
    expect(result.type).toBe('error');
    expect(result.message).toBe('Unexpected response from server.');
  });

  test('valid unclaimed slip maps all fields', () => {
    const result = parseSlipResponse({
      raw_text:       'SPAR\nTotal: R100.00',
      created_at:     '2026-06-24T10:00:00.000Z',
      claimed:        false,
      parsed_content: null,
    });
    expect(result.type).toBe('ok');
    expect(result.rawText).toBe('SPAR\nTotal: R100.00');
    expect(result.claimed).toBe(false);
    expect(result.createdAt).toEqual(new Date('2026-06-24T10:00:00.000Z'));
    expect(result.parsedContent).toBeNull();
  });

  test('valid claimed slip', () => {
    const result = parseSlipResponse({
      raw_text:   'WOOLWORTHS',
      created_at: '2026-06-24T10:00:00.000Z',
      claimed:    true,
    });
    expect(result.type).toBe('ok');
    expect(result.claimed).toBe(true);
  });

  test('slip with barcodes threads parsedContent through', () => {
    const parsedContent = { barcodes: [{ type: 'CODE128', value: '5432109876543', position: 'bottom' }], has_logo: false };
    const result = parseSlipResponse({
      raw_text:       'PICK N PAY',
      created_at:     '2026-06-24T10:00:00.000Z',
      claimed:        false,
      parsed_content: parsedContent,
    });
    expect(result.type).toBe('ok');
    expect(result.parsedContent).toEqual(parsedContent);
  });

  test('logo_url threaded through as logoUrl', () => {
    const result = parseSlipResponse({
      raw_text:   'CITY FRESH',
      created_at: '2026-06-24T10:00:00.000Z',
      claimed:    false,
      logo_url:   'https://example.com/logo.png',
    });
    expect(result.type).toBe('ok');
    expect(result.logoUrl).toBe('https://example.com/logo.png');
  });

  test('logoUrl is null when logo_url absent', () => {
    const result = parseSlipResponse({
      raw_text:   'SPAR',
      created_at: '2026-06-24T10:00:00.000Z',
      claimed:    false,
    });
    expect(result.type).toBe('ok');
    expect(result.logoUrl).toBeNull();
  });
});

describe('getSlipId', () => {
  const UUID = '123e4567-e89b-12d3-a456-426614174000';

  test('extracts UUID from /slip/<uuid> path', () => {
    expect(getSlipId('/slip/' + UUID, '')).toBe(UUID);
  });

  test('extracts UUID from path with trailing slash', () => {
    expect(getSlipId('/slip/' + UUID + '/', '')).toBe(UUID);
  });

  test('falls back to ?id query param', () => {
    expect(getSlipId('/', '?id=' + UUID)).toBe(UUID);
  });

  test('falls back to ?slip query param', () => {
    expect(getSlipId('/', '?slip=' + UUID)).toBe(UUID);
  });

  test('returns null when path has no UUID', () => {
    expect(getSlipId('/slip/not-a-uuid', '')).toBeNull();
  });

  test('returns null when path and query are both empty', () => {
    expect(getSlipId('/', '')).toBeNull();
  });

  test('rejects malformed UUID in query param', () => {
    expect(getSlipId('/', '?id=not-a-uuid')).toBeNull();
  });
});

describe('fitReceiptText', () => {
  const { fitReceiptText } = require('./slip-logic');

  test('wide line — font size scales down to fit', () => {
    // 42 chars at 0.60 ratio in 284px → 284/(42*0.60) ≈ 11.3px
    const raw = 'A'.repeat(42) + '\n';
    const { fontSize } = fitReceiptText(raw, 284);
    expect(fontSize).toBeCloseTo(11.3, 0);
  });

  test('short receipt — clamps at MAX_FONT_SIZE (13)', () => {
    const raw = 'SHORT\n';
    const { fontSize } = fitReceiptText(raw, 284);
    expect(fontSize).toBe(13);
  });

  test('extremely wide line — clamps at MIN_FONT_SIZE (9)', () => {
    const raw = 'A'.repeat(60) + '\n';
    const { fontSize } = fitReceiptText(raw, 284);
    expect(fontSize).toBe(9);
  });

  test('widest line across multiple lines drives the size', () => {
    const raw = 'SHORT\n' + 'A'.repeat(42) + '\nSHORT\n';
    const { fontSize } = fitReceiptText(raw, 284);
    expect(fontSize).toBeCloseTo(11.3, 0);
  });

  test('empty text — clamps at MAX_FONT_SIZE', () => {
    const { fontSize } = fitReceiptText('', 284);
    expect(fontSize).toBe(13);
  });
});

describe('buildTextSegments', () => {
  const BARCODE = { type: 'CODE128', value: '9782504938271', position: 'bottom' };
  const MARKER_LINE = '{B9782504938271\n';

  test('marker found — splits into text / barcode / text', () => {
    const raw = 'PEP REWARDS\nScan your card\n' + MARKER_LINE + 'Thank you\n';
    const segs = buildTextSegments(raw, [BARCODE]);
    expect(segs).toEqual([
      { type: 'text',    content: 'PEP REWARDS\nScan your card\n' },
      { type: 'barcode', value:   '9782504938271' },
      { type: 'text',    content: 'Thank you\n' },
    ]);
  });

  test('marker not found — barcode appended at bottom', () => {
    const raw = 'PEP REWARDS\nScan your card\n';
    const segs = buildTextSegments(raw, [BARCODE]);
    expect(segs).toEqual([
      { type: 'text',    content: 'PEP REWARDS\nScan your card\n' },
      { type: 'barcode', value:   '9782504938271' },
    ]);
  });

  test('artifact line is stripped from visible text', () => {
    const raw = 'Before\n' + MARKER_LINE + 'After\n';
    const segs = buildTextSegments(raw, [BARCODE]);
    const textContent = segs.filter(s => s.type === 'text').map(s => s.content).join('');
    expect(textContent).not.toContain('{B');
    expect(textContent).not.toContain('9782504938271');
  });

  test('marker at end of text — no trailing text segment', () => {
    const raw = 'Scan your card\n' + MARKER_LINE;
    const segs = buildTextSegments(raw, [BARCODE]);
    expect(segs).toEqual([
      { type: 'text',    content: 'Scan your card\n' },
      { type: 'barcode', value:   '9782504938271' },
    ]);
  });

  test('no barcodes — returns single text segment unchanged', () => {
    const raw = 'PEP STORES\nTotal: R100\n';
    expect(buildTextSegments(raw, [])).toEqual([{ type: 'text', content: raw }]);
    expect(buildTextSegments(raw, null)).toEqual([{ type: 'text', content: raw }]);
  });

  test('null rawText — returns empty text segment', () => {
    const segs = buildTextSegments(null, null);
    expect(segs).toEqual([{ type: 'text', content: '' }]);
  });

  test('logo: 0s artifact stripped and logo prepended', () => {
    const raw = '0s\nCITY FRESH\nTotal: R50\n';
    const segs = buildTextSegments(raw, null, 'https://example.com/logo.png');
    expect(segs).toEqual([
      { type: 'logo', url: 'https://example.com/logo.png' },
      { type: 'text', content: 'CITY FRESH\nTotal: R50\n' },
    ]);
  });

  test('logo: no 0s artifact — logo still prepended, text unchanged', () => {
    const raw = 'CITY FRESH\nTotal: R50\n';
    const segs = buildTextSegments(raw, null, 'https://example.com/logo.png');
    expect(segs).toEqual([
      { type: 'logo', url: 'https://example.com/logo.png' },
      { type: 'text', content: 'CITY FRESH\nTotal: R50\n' },
    ]);
  });

  test('logo: null logoUrl — no logo segment', () => {
    const raw = '0s\nCITY FRESH\n';
    const segs = buildTextSegments(raw, null, null);
    expect(segs).toEqual([{ type: 'text', content: '0s\nCITY FRESH\n' }]);
  });

  test('logo: 0s artifact not visible in text segments', () => {
    const raw = '0s\nCITY FRESH\n';
    const segs = buildTextSegments(raw, null, 'https://example.com/logo.png');
    const text = segs.filter(s => s.type === 'text').map(s => s.content).join('');
    expect(text).not.toContain('0s');
  });

  test('parsed_content.barcodes empty but {B marker in text — barcode still rendered (fallback)', () => {
    const raw = 'Scan your card\n{B9782504938271\nThank you\n';
    const segs = buildTextSegments(raw, []);
    expect(segs).toEqual([
      { type: 'text',    content: 'Scan your card\n' },
      { type: 'barcode', value:   '9782504938271' },
      { type: 'text',    content: 'Thank you\n' },
    ]);
  });

  test('logo + empty barcodes + {B in text — logo, barcode inline (CITY FRESH regression)', () => {
    const raw = '0s\nCITY FRESH\nScan your card\n{B9782504938271\nThank you\n';
    const segs = buildTextSegments(raw, [], 'https://example.com/logo.png');
    expect(segs).toEqual([
      { type: 'logo',    url:     'https://example.com/logo.png' },
      { type: 'text',   content: 'CITY FRESH\nScan your card\n' },
      { type: 'barcode', value:  '9782504938271' },
      { type: 'text',   content: 'Thank you\n' },
    ]);
  });

  test('logo and barcode together — logo first, barcode inline', () => {
    const raw = '0s\nScan your card\n{B9782504938271\nThank you\n';
    const segs = buildTextSegments(raw, [{ type: 'CODE128', value: '9782504938271' }], 'https://example.com/logo.png');
    expect(segs).toEqual([
      { type: 'logo',    url:     'https://example.com/logo.png' },
      { type: 'text',   content: 'Scan your card\n' },
      { type: 'barcode', value:  '9782504938271' },
      { type: 'text',   content: 'Thank you\n' },
    ]);
  });
});
