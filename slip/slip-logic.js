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
    logoUrl:       data.logo_url || null,
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

function buildTextSegments(rawText, barcodes, logoUrl) {
  var text = rawText || '';

  if (logoUrl) {
    text = text.replace(/^0s\n?/, '');
    var segments = [{ type: 'logo', url: logoUrl }, { type: 'text', content: text }];
    if (!barcodes || !barcodes.length) return segments;
    return applyBarcodes(segments, barcodes);
  }

  var segments = [{ type: 'text', content: text }];
  if (!barcodes || !barcodes.length) return segments;

  return applyBarcodes(segments, barcodes);
}

function applyBarcodes(segments, barcodes) {
  var unplaced = [];

  barcodes.forEach(function(bc) {
    var marker = '{B' + bc.value;
    var found = false;
    var result = [];

    segments.forEach(function(seg) {
      if (seg.type !== 'text') { result.push(seg); return; }
      var idx = seg.content.indexOf(marker);
      if (idx === -1) { result.push(seg); return; }
      found = true;
      var lineEnd = seg.content.indexOf('\n', idx);
      var before = seg.content.slice(0, idx);
      var after = lineEnd === -1 ? '' : seg.content.slice(lineEnd + 1);
      if (before) result.push({ type: 'text', content: before });
      result.push({ type: 'barcode', value: bc.value });
      if (after) result.push({ type: 'text', content: after });
    });

    if (found) {
      segments = result;
    } else {
      unplaced.push(bc);
    }
  });

  unplaced.forEach(function(bc) {
    segments.push({ type: 'barcode', value: bc.value });
  });

  return segments;
}

if (typeof module !== 'undefined') module.exports = { parseSlipResponse, getSlipId, buildTextSegments };
