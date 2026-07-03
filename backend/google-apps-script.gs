const MESSAGES_SHEET = 'messages';
const REPLIES_SHEET = 'replies';
const MESSAGES_HEADER = ['msgId', 'timestamp', 'message', 'createdAt', 'userAgent', 'ip'];
const REPLIES_HEADER = ['replyId', 'msgId', 'reply', 'repliedAt'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const message = sanitizeText(body.message || '', 2000);
    const createdAt = sanitizeText(body.createdAt || '', 64);
    const userAgent = sanitizeText(body.userAgent || '', 500);
    const action = sanitizeText(body.action || '', 30);

    if (action === 'admin_reply') {
      const adminPassword = sanitizeText(body.adminPassword || '', 100);
      const msgId = sanitizeText(body.msgId || '', 50);
      const reply = sanitizeText(body.reply || '', 2000);
      
      if (adminPassword !== 'tutu2024') {
        return jsonResponse({ ok: false, error: 'unauthorized' }, 403);
      }
      
      if (!msgId || !reply) {
        return jsonResponse({ ok: false, error: 'missing-fields' }, 400);
      }
      
      const repliesSheet = getOrCreateSheet(REPLIES_SHEET, REPLIES_HEADER);
      const replyId = 'R_' + new Date().getTime();
      repliesSheet.appendRow([replyId, msgId, reply, new Date().toISOString()]);
      
      return jsonResponse({ ok: true, replyId });
    }

    if (!message) {
      return jsonResponse({ ok: false, error: 'message-required' }, 400);
    }

    const messagesSheet = getOrCreateSheet(MESSAGES_SHEET, MESSAGES_HEADER);
    const msgId = 'M_' + new Date().getTime();
    const msgNumber = messagesSheet.getLastRow();
    
    messagesSheet.appendRow([
      msgId,
      new Date(),
      message,
      createdAt,
      userAgent,
      getClientIp(e)
    ]);

    return jsonResponse({ ok: true, msgId, msgNumber });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
}

function doGet(e) {
  try {
    const params = (typeof e !== 'undefined' && e && e.parameter) ? e.parameter : {};
    const action = sanitizeText(params.action || '', 30);

    if (action === 'submit') {
      const message = sanitizeText(params.message || '', 2000);
      const createdAt = sanitizeText(params.createdAt || '', 64);
      const userAgent = sanitizeText(params.userAgent || '', 500);

      if (!message) {
        return jsonResponse({ ok: false, error: 'message-required' }, 400);
      }

      const messagesSheet = getOrCreateSheet(MESSAGES_SHEET, MESSAGES_HEADER);
      const msgId = 'M_' + new Date().getTime();
      const msgNumber = messagesSheet.getLastRow();
      
      messagesSheet.appendRow([
        msgId,
        new Date(),
        message,
        createdAt,
        userAgent,
        ''
      ]);

      return jsonResponse({ ok: true, msgId, msgNumber, mode: 'get-submit' });
    }

    if (action === 'admin_list') {
      const adminPassword = sanitizeText(params.adminPassword || '', 100);
      if (adminPassword !== 'tutu2024') {
        return jsonResponse({ ok: false, error: 'unauthorized' }, 403);
      }

      const messagesSheet = getOrCreateSheet(MESSAGES_SHEET, MESSAGES_HEADER);
      const data = messagesSheet.getDataRange().getValues();
      const messages = data.slice(1).map((row, idx) => ({
        msgNumber: idx + 1,
        msgId: row[0],
        message: row[2],
        timestamp: row[1].toString(),
        hasReply: false
      }));

      const repliesSheet = getOrCreateSheet(REPLIES_SHEET, REPLIES_HEADER);
      const repliesData = repliesSheet.getDataRange().getValues();
      const replies = {};
      repliesData.slice(1).forEach(row => {
        replies[row[1]] = row[2];
      });

      messages.forEach(msg => {
        if (replies[msg.msgId]) {
          msg.hasReply = true;
          msg.reply = replies[msg.msgId];
        }
      });

      return jsonResponse({ ok: true, messages });
    }

    if (action === 'get_reply') {
      const msgNumber = sanitizeText(params.msgNumber || '', 50);
      if (!msgNumber) {
        return jsonResponse({ ok: false, error: 'msgNumber-required' }, 400);
      }

      const messagesSheet = getOrCreateSheet(MESSAGES_SHEET, MESSAGES_HEADER);
      const data = messagesSheet.getDataRange().getValues();
      
      const messageData = data[parseInt(msgNumber)];
      if (!messageData) {
        return jsonResponse({ ok: false, error: 'message-not-found' }, 404);
      }

      const msgId = messageData[0];
      const repliesSheet = getOrCreateSheet(REPLIES_SHEET, REPLIES_HEADER);
      const repliesData = repliesSheet.getDataRange().getValues();
      
      for (let i = 1; i < repliesData.length; i++) {
        if (repliesData[i][1] === msgId) {
          return jsonResponse({ ok: true, reply: repliesData[i][2], msgNumber });
        }
      }

      return jsonResponse({ ok: false, error: 'no-reply-yet' }, 404);
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

function getOrCreateSheet(sheetName, header) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
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
