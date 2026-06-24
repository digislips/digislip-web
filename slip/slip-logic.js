function parseSlipResponse(data) {
  if (data.error === 'not_found' || data.code === 'not_found') {
    return { type: 'not_found' };
  }
  if (data.error || data.code) {
    return { type: 'error', message: data.message || data.error || data.code };
  }
  if (!data.created_at) {
    return { type: 'error', message: 'Unexpected response from server.' };
  }
  return {
    type: 'ok',
    rawText:       data.raw_text || '',
    createdAt:     new Date(data.created_at),
    claimed:       !!data.claimed,
    parsedContent: data.parsed_content || null,
  };
}

function getSlipId(pathname, search) {
  var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var parts = pathname.split('/').filter(Boolean);
  for (var i = parts.length - 1; i >= 0; i--) {
    if (uuidRe.test(parts[i])) return parts[i];
  }
  var params = new URLSearchParams(search);
  var id = params.get('id') || params.get('slip');
  return (id && uuidRe.test(id)) ? id : null;
}

if (typeof module !== 'undefined') module.exports = { parseSlipResponse, getSlipId };
