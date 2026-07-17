function parseRecoveryHash(hash) {
  var params = new URLSearchParams(hash);

  var error = params.get('error');
  if (error) {
    var code = params.get('error_code');
    var desc = params.get('error_description');

    if (code === 'otp_expired') {
      return {
        type: 'error',
        title: 'Link expired.',
        body: 'This password reset link has expired. Request a new one below.',
      };
    }
    return {
      type: 'error',
      title: 'Something went wrong.',
      body: desc
        ? desc.replace(/\+/g, ' ')
        : 'This link is invalid or has already been used. Request a fresh reset link below.',
    };
  }

  if (params.get('type') === 'recovery' && params.get('access_token')) {
    return { type: 'recovery' };
  }

  return { type: 'request' };
}

var MIN_PASSWORD_LENGTH = 6;

function validateNewPassword(password, confirm) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.' };
  }
  if (password !== confirm) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  return { valid: true };
}

if (typeof module !== 'undefined') module.exports = { parseRecoveryHash, validateNewPassword, MIN_PASSWORD_LENGTH };
