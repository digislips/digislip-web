const { parseSlipResponse, getSlipId } = require('./slip-logic');

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
