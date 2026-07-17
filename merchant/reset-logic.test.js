const { parseRecoveryHash, validateNewPassword, MIN_PASSWORD_LENGTH } = require('./reset-logic');

describe('parseRecoveryHash', () => {
  test('otp_expired error — link expired copy', () => {
    const result = parseRecoveryHash('error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    expect(result.type).toBe('error');
    expect(result.title).toBe('Link expired.');
    expect(result.body).toBe('This password reset link has expired. Request a new one below.');
  });

  test('other error with description — description used, plus signs decoded to spaces', () => {
    const result = parseRecoveryHash('error=server_error&error_code=unexpected_failure&error_description=Something+broke');
    expect(result.type).toBe('error');
    expect(result.title).toBe('Something went wrong.');
    expect(result.body).toBe('Something broke');
  });

  test('other error without description — default body', () => {
    const result = parseRecoveryHash('error=server_error&error_code=unexpected_failure');
    expect(result.type).toBe('error');
    expect(result.title).toBe('Something went wrong.');
    expect(result.body).toBe('This link is invalid or has already been used. Request a fresh reset link below.');
  });

  test('valid recovery hash — type recovery with access_token', () => {
    const result = parseRecoveryHash('access_token=abc123&refresh_token=def456&expires_in=3600&token_type=bearer&type=recovery');
    expect(result).toEqual({ type: 'recovery' });
  });

  test('type=recovery but missing access_token — falls back to request', () => {
    const result = parseRecoveryHash('type=recovery');
    expect(result).toEqual({ type: 'request' });
  });

  test('empty hash — request state', () => {
    expect(parseRecoveryHash('')).toEqual({ type: 'request' });
  });

  test('unrelated params, no error or recovery type — request state', () => {
    expect(parseRecoveryHash('foo=bar')).toEqual({ type: 'request' });
  });
});

describe('validateNewPassword', () => {
  test('too short — invalid with length message', () => {
    const result = validateNewPassword('abc', 'abc');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Password must be at least 6 characters.');
  });

  test('empty password — invalid', () => {
    const result = validateNewPassword('', '');
    expect(result.valid).toBe(false);
  });

  test('passwords do not match — invalid with mismatch message', () => {
    const result = validateNewPassword('abcdef', 'abcdeg');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Passwords do not match.');
  });

  test('exactly MIN_PASSWORD_LENGTH and matching — valid', () => {
    const password = 'a'.repeat(MIN_PASSWORD_LENGTH);
    const result = validateNewPassword(password, password);
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  test('long matching passwords — valid', () => {
    const result = validateNewPassword('correct-horse-battery', 'correct-horse-battery');
    expect(result.valid).toBe(true);
  });
});
