const SHEET_NAME = 'messages';
const HEADER = ['timestamp', 'sender', 'message', 'createdAt', 'userAgent', 'ip'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const sender = sanitizeText(body.sender || '匿名', 60);
    const message = sanitizeText(body.message || '', 2000);
    const createdAt = sanitizeText(body.createdAt || '', 64);
    const userAgent = sanitizeText(body.userAgent || '', 500);

    if (!message) {
      return jsonResponse({ ok: false, error: 'message-required' }, 400);
    }

    const sheet = getOrCreateSheet();
    sheet.appendRow([
      new Date(),
      sender,
      message,
      createdAt,
      userAgent,
      getClientIp(e)
    ]);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
}

function doGet(e) {
  try {
    const params = (typeof e !== 'undefined' && e && e.parameter) ? e.parameter : {};
    const action = sanitizeText(params.action || '', 30);

    if (action === 'submit') {
      const sender = sanitizeText(params.sender || '匿名', 60);
      const message = sanitizeText(params.message || '', 2000);
      const createdAt = sanitizeText(params.createdAt || '', 64);
      const userAgent = sanitizeText(params.userAgent || '', 500);

      if (!message) {
        return jsonResponse({ ok: false, error: 'message-required' }, 400);
      }

      const sheet = getOrCreateSheet();
      sheet.appendRow([
        new Date(),
        sender,
        message,
        createdAt,
        userAgent,
        ''
      ]);

      return jsonResponse({ ok: true, mode: 'get-submit' });
    }

    return jsonResponse({ ok: true, service: 'tutu-message-api' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
}

function sanitizeText(value, maxLen) {
  const text = String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return text.slice(0, maxLen);
}

function getOrCreateSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getClientIp(e) {
  try {
    return e && e.parameter && e.parameter.ip ? String(e.parameter.ip) : '';
  } catch (_) {
    return '';
  }
}

function jsonResponse(payload, statusCode) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);

  output.setContent(JSON.stringify(Object.assign({ status: statusCode || 200 }, payload)));
  return output;
}
