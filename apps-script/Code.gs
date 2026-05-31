// Pickleball Matrix — Google Apps Script backend
// ADD these functions to the bottom of your existing Apps Script — do NOT replace your ELO code.
// Then deploy as a web app: Execute as "Me", Who has access "Anyone"

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;

  if (action === 'getMatches') {
    var sheet = ss.getSheetByName('SCORESHEET');
    var data = sheet.getDataRange().getDisplayValues();
    return json(data);
  }

  if (action === 'getTab') {
    var tabName = e.parameter.tab;
    var tab = ss.getSheetByName(tabName);
    if (!tab) return json([]);
    return json(tab.getDataRange().getDisplayValues());
  }

  if (action === 'getProfile') {
    var player = e.parameter.player.toUpperCase();
    var sheet = ss.getSheetByName('PROFILES');
    if (!sheet) return json({});
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] && rows[i][0].toString().toUpperCase() === player) {
        return json({ player: rows[i][0], photoUrl: rows[i][1] || '', bio: rows[i][2] || '' });
      }
    }
    return json({});
  }

  return json({ error: 'Unknown action' });
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);

  if (data.action === 'upsertProfile') {
    var sheet = ss.getSheetByName('PROFILES');
    if (!sheet) {
      sheet = ss.insertSheet('PROFILES');
      sheet.appendRow(['PLAYER', 'PHOTO_URL', 'BIO']);
    }
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] && rows[i][0].toString().toUpperCase() === data.player.toUpperCase()) {
        sheet.getRange(i + 1, 2).setValue(data.photoUrl || '');
        sheet.getRange(i + 1, 3).setValue(data.bio || '');
        return json({ success: true });
      }
    }
    sheet.appendRow([data.player.toUpperCase(), data.photoUrl || '', data.bio || '']);
    return json({ success: true });
  }

  // Match submission
  var sheet = ss.getSheetByName('SCORESHEET');
  var lastRow = sheet.getLastRow();
  var lastId = lastRow > 1 ? Number(sheet.getRange(lastRow, 1).getValue()) : 0;
  var newId = lastId + 1;

  sheet.appendRow([
    newId,
    data.date,
    data.bracket,
    data.type,
    data.team1,
    data.team2,
    data.win,
    data.loss,
    data.team1Score,
    data.team2Score,
    data.players
  ]);

  return json({ success: true, matchId: newId });
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
