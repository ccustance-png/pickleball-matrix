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

  return json({ error: 'Unknown action' });
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('SCORESHEET');
  var data = JSON.parse(e.postData.contents);

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
