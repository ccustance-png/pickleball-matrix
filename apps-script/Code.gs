const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  if (!e || !e.parameter) return json({ error: 'No parameters provided' });
  const action = e.parameter.action;

  if (action === 'getMatches') {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('SCORESHEET');
    const data = sheet.getDataRange().getValues();
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getTab') {
    const tabName = e.parameter.tab;
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(tabName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(JSON.stringify(sheet.getDataRange().getValues())).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getProfile') {
    const player = (e.parameter.player || '').trim().toUpperCase();
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('PROFILES');
    if (!sheet) return json({ player: '', photoUrl: '', bio: '', googleEmail: '', firstName: '', lastName: '', location: '' });
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim().toUpperCase() === player)
        return json({ player: rows[i][0], photoUrl: rows[i][1] || '', bio: rows[i][2] || '', googleEmail: rows[i][3] || '', firstName: rows[i][4] || '', lastName: rows[i][5] || '', location: rows[i][6] || '' });
    }
    return json({ player: '', photoUrl: '', bio: '', googleEmail: '', firstName: '', lastName: '', location: '' });
  }

  if (action === 'getMatchNotes') {
    const ids = (e.parameter.ids || '').split(',').map(Number).filter(Boolean);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('MATCH_NOTES');
    if (!sheet || ids.length === 0) return json({});
    const rows = sheet.getDataRange().getValues();
    const result = {};
    for (let i = 1; i < rows.length; i++) {
      const mid = Number(rows[i][0]);
      if (ids.includes(mid)) result[mid] = { matchId: mid, photoUrl: rows[i][1] || '', location: rows[i][2] || '', description: rows[i][3] || '' };
    }
    return json(result);
  }

  if (action === 'getAllMatchNotes') {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('MATCH_NOTES');
    if (!sheet) return json([]);
    const rows = sheet.getDataRange().getValues();
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      result.push({ matchId: Number(rows[i][0]), photoUrl: rows[i][1] || '', location: rows[i][2] || '', description: rows[i][3] || '' });
    }
    return json(result);
  }

  if (action === 'getMatchComments') {
    const matchId = Number(e.parameter.matchId);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('MATCH_COMMENTS');
    if (!sheet) return json([]);
    const rows = sheet.getDataRange().getValues();
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i][1]) === matchId)
        result.push({ commentId: rows[i][0], matchId: Number(rows[i][1]), authorEmail: rows[i][2], authorName: rows[i][3], text: rows[i][4], timestamp: rows[i][5] });
    }
    return json(result);
  }

  if (action === 'getDinks') {
    const matchId = Number(e.parameter.matchId);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('MATCH_DINKS');
    if (!sheet) return json([]);
    const rows = sheet.getDataRange().getValues();
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i][0]) === matchId)
        result.push({ matchId: Number(rows[i][0]), userEmail: rows[i][1], userName: rows[i][2], timestamp: rows[i][3] });
    }
    return json(result);
  }

  if (action === 'getFriends') {
    const player = (e.parameter.player || '').trim().toUpperCase();
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('FRIENDS');
    if (!sheet) return json([]);
    const rows = sheet.getDataRange().getValues();
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      const from = (rows[i][1] || '').toString().trim().toUpperCase();
      const to   = (rows[i][2] || '').toString().trim().toUpperCase();
      if (from === player || to === player) {
        result.push({ requestId: rows[i][0], fromPlayer: rows[i][1], toPlayer: rows[i][2], status: rows[i][3], createdAt: rows[i][4] });
      }
    }
    return json(result);
  }

  if (action === 'getPushSubscriptions') {
    const players = (e.parameter.players || '').split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('PUSH_SUBSCRIPTIONS');
    if (!sheet || !players.length) return json([]);
    const rows = sheet.getDataRange().getValues();
    const subs = [];
    for (let i = 1; i < rows.length; i++) {
      if (players.includes((rows[i][0] || '').toString().trim().toUpperCase()) && rows[i][1]) {
        subs.push(rows[i][1].toString());
      }
    }
    return json(subs);
  }

  if (action === 'getChallenges') {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('CHALLENGES');
    if (!sheet) return json([]);
    const rows = sheet.getDataRange().getValues();
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      result.push({ challengeId: rows[i][0], fromPlayer: rows[i][1], fromEmail: rows[i][2], toPlayer: rows[i][3], type: rows[i][4], message: rows[i][5], status: rows[i][6], createdAt: rows[i][7] });
    }
    return json(result);
  }

  return json({ error: 'Unknown action' });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(SHEET_ID);

  if (data.action === 'sendFriendRequest') {
    let sheet = ss.getSheetByName('FRIENDS');
    if (!sheet) {
      sheet = ss.insertSheet('FRIENDS');
      sheet.appendRow(['requestId','fromPlayer','toPlayer','status','createdAt']);
    }
    // Check for existing request between these two players
    const rows = sheet.getDataRange().getValues();
    const from = (data.fromPlayer || '').toString().trim().toUpperCase();
    const to   = (data.toPlayer   || '').toString().trim().toUpperCase();
    for (let i = 1; i < rows.length; i++) {
      const rf = (rows[i][1] || '').toString().trim().toUpperCase();
      const rt = (rows[i][2] || '').toString().trim().toUpperCase();
      if ((rf === from && rt === to) || (rf === to && rt === from)) {
        return json({ requestId: rows[i][0], existing: true });
      }
    }
    const requestId = Utilities.getUuid();
    sheet.appendRow([requestId, data.fromPlayer, data.toPlayer, 'PENDING', new Date().toISOString()]);
    return json({ requestId });
  }

  if (data.action === 'updateFriendRequest') {
    const sheet = ss.getSheetByName('FRIENDS');
    if (!sheet) return json({ ok: false });
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.requestId) {
        sheet.getRange(i + 1, 4).setValue(data.status);
        return json({ ok: true });
      }
    }
    return json({ ok: false });
  }

  if (data.action === 'savePushSubscription') {
    let sheet = ss.getSheetByName('PUSH_SUBSCRIPTIONS');
    if (!sheet) {
      sheet = ss.insertSheet('PUSH_SUBSCRIPTIONS');
      sheet.appendRow(['playerName', 'subscription', 'updatedAt']);
    }
    const player = (data.playerName || '').trim().toUpperCase();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim().toUpperCase() === player) {
        sheet.getRange(i + 1, 2).setValue(data.subscription);
        sheet.getRange(i + 1, 3).setValue(new Date().toISOString());
        return json({ ok: true });
      }
    }
    sheet.appendRow([player, data.subscription, new Date().toISOString()]);
    return json({ ok: true });
  }

  if (data.action === 'upsertProfile') {
    const sheet = ss.getSheetByName('PROFILES');
    const rows = sheet.getDataRange().getValues();
    const player = (data.player || '').trim().toUpperCase();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim().toUpperCase() === player) {
        sheet.getRange(i + 1, 2).setValue(data.photoUrl !== undefined ? data.photoUrl : rows[i][1]);
        sheet.getRange(i + 1, 3).setValue(data.bio !== undefined ? data.bio : rows[i][2]);
        if (data.firstName !== undefined) sheet.getRange(i + 1, 5).setValue(data.firstName);
        if (data.lastName  !== undefined) sheet.getRange(i + 1, 6).setValue(data.lastName);
        if (data.location  !== undefined) sheet.getRange(i + 1, 7).setValue(data.location);
        return json({ ok: true });
      }
    }
    sheet.appendRow([data.player, data.photoUrl || '', data.bio || '', '', data.firstName || '', data.lastName || '', data.location || '']);
    return json({ ok: true });
  }

  if (data.action === 'claimProfile') {
    const sheet = ss.getSheetByName('PROFILES');
    const rows = sheet.getDataRange().getValues();
    const player = (data.player || '').trim().toUpperCase();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').toString().trim().toUpperCase() === player) {
        sheet.getRange(i + 1, 4).setValue(data.googleEmail || '');
        if (data.firstName !== undefined) sheet.getRange(i + 1, 5).setValue(data.firstName);
        if (data.lastName  !== undefined) sheet.getRange(i + 1, 6).setValue(data.lastName);
        return json({ ok: true });
      }
    }
    sheet.appendRow([data.player, '', '', data.googleEmail || '', data.firstName || '', data.lastName || '']);
    return json({ ok: true });
  }

  if (data.action === 'renamePlayer') {
    const oldName = (data.oldName || '').toString().trim().toUpperCase();
    const newName = (data.newName || '').toString().trim().toUpperCase();
    if (!oldName || !newName || oldName === newName) return json({ ok: false, error: 'Invalid names' });

    function replaceName(cell, from, to) {
      return cell.split('/').map(function(p) {
        return p.trim().toUpperCase() === from ? to : p.trim();
      }).join('/');
    }

    const scoreSheet = ss.getSheetByName('SCORESHEET');
    const rows = scoreSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      var colMap = [[4,5],[5,6],[6,7],[7,8],[10,11]];
      for (var c = 0; c < colMap.length; c++) {
        var ri = colMap[c][0], col = colMap[c][1];
        var val = (rows[i][ri] || '').toString();
        var updated = replaceName(val, oldName, newName);
        if (updated !== val) scoreSheet.getRange(i + 1, col).setValue(updated);
      }
    }

    const profileSheet = ss.getSheetByName('PROFILES');
    const pRows = profileSheet.getDataRange().getValues();
    for (let i = 1; i < pRows.length; i++) {
      if ((pRows[i][0] || '').toString().trim().toUpperCase() === oldName) {
        profileSheet.getRange(i + 1, 1).setValue(newName);
        break;
      }
    }

    updateElo();
    return json({ ok: true });
  }

  if (data.action === 'saveMatchNote') {
    const sheet = ss.getSheetByName('MATCH_NOTES');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i][0]) === Number(data.matchId)) {
        sheet.getRange(i + 1, 2).setValue(data.photoUrl || '');
        sheet.getRange(i + 1, 3).setValue(data.location || '');
        sheet.getRange(i + 1, 4).setValue(data.description || '');
        return json({ ok: true });
      }
    }
    sheet.appendRow([data.matchId, data.photoUrl || '', data.location || '', data.description || '']);
    return json({ ok: true });
  }

  if (data.action === 'addMatchComment') {
    const sheet = ss.getSheetByName('MATCH_COMMENTS');
    const commentId = Utilities.getUuid();
    sheet.appendRow([commentId, data.matchId, data.authorEmail, data.authorName, data.text, data.timestamp]);
    return json({ ok: true, commentId });
  }

  if (data.action === 'toggleDink') {
    let sheet = ss.getSheetByName('MATCH_DINKS');
    if (!sheet) { sheet = ss.insertSheet('MATCH_DINKS'); sheet.appendRow(['matchId','userEmail','userName','timestamp']); }
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i][0]) === Number(data.matchId) && rows[i][1] === data.userEmail) {
        sheet.deleteRow(i + 1);
        return json({ ok: true, dinked: false });
      }
    }
    sheet.appendRow([data.matchId, data.userEmail, data.userName, new Date().toISOString()]);
    return json({ ok: true, dinked: true });
  }

  if (data.action === 'createChallenge') {
    let sheet = ss.getSheetByName('CHALLENGES');
    if (!sheet) { sheet = ss.insertSheet('CHALLENGES'); sheet.appendRow(['challengeId','fromPlayer','fromEmail','toPlayer','type','message','status','createdAt']); }
    const challengeId = Utilities.getUuid();
    sheet.appendRow([challengeId, data.fromPlayer, data.fromEmail, data.toPlayer, data.type, data.message || '', 'OPEN', new Date().toISOString()]);
    return json({ ok: true, challengeId });
  }

  if (data.action === 'updateChallenge') {
    const sheet = ss.getSheetByName('CHALLENGES');
    if (!sheet) return json({ ok: false });
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.challengeId) {
        sheet.getRange(i + 1, 7).setValue(data.status);
        return json({ ok: true });
      }
    }
    return json({ ok: false });
  }

  if (data.action === 'updateMatch') {
    const sheet = ss.getSheetByName('SCORESHEET');
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i][0]) === Number(data.matchId)) {
        const row = i + 1;
        sheet.getRange(row, 2).setValue(data.date);
        sheet.getRange(row, 3).setValue(data.bracket);
        sheet.getRange(row, 4).setValue(data.type);
        sheet.getRange(row, 5).setValue(data.team1);
        sheet.getRange(row, 6).setValue(data.team2);
        sheet.getRange(row, 7).setValue(data.win);
        sheet.getRange(row, 8).setValue(data.loss);
        sheet.getRange(row, 9).setValue(data.team1Score);
        sheet.getRange(row, 10).setValue(data.team2Score);
        sheet.getRange(row, 11).setValue(data.players);
        updateElo();
        return json({ ok: true });
      }
    }
    return json({ ok: false, error: 'Match not found' });
  }

  if (data.action === 'deleteMatch') {
    const scoreSheet = ss.getSheetByName('SCORESHEET');
    const scoreRows = scoreSheet.getDataRange().getValues();
    for (let i = 1; i < scoreRows.length; i++) {
      if (Number(scoreRows[i][0]) === Number(data.matchId)) { scoreSheet.deleteRow(i + 1); break; }
    }
    const notesSheet = ss.getSheetByName('MATCH_NOTES');
    if (notesSheet) { const r = notesSheet.getDataRange().getValues(); for (let i = r.length-1; i >= 1; i--) { if (Number(r[i][0]) === Number(data.matchId)) notesSheet.deleteRow(i+1); } }
    const commentsSheet = ss.getSheetByName('MATCH_COMMENTS');
    if (commentsSheet) { const r = commentsSheet.getDataRange().getValues(); for (let i = r.length-1; i >= 1; i--) { if (Number(r[i][1]) === Number(data.matchId)) commentsSheet.deleteRow(i+1); } }
    const dinksSheet = ss.getSheetByName('MATCH_DINKS');
    if (dinksSheet) { const r = dinksSheet.getDataRange().getValues(); for (let i = r.length-1; i >= 1; i--) { if (Number(r[i][0]) === Number(data.matchId)) dinksSheet.deleteRow(i+1); } }
    updateElo();
    return json({ ok: true });
  }

  if (data.action === 'sendMessage') {
    let sheet = ss.getSheetByName('MESSAGES');
    if (!sheet) {
      sheet = ss.insertSheet('MESSAGES');
      sheet.appendRow(['messageId','fromPlayer','toPlayer','text','timestamp','read']);
    }
    const messageId = Utilities.getUuid();
    sheet.appendRow([messageId, data.fromPlayer||'', data.toPlayer||'', data.text||'', data.timestamp||new Date().toISOString(), 'false']);
    return json({ ok: true, messageId });
  }

  if (data.action === 'markMessagesRead') {
    const sheet = ss.getSheetByName('MESSAGES');
    if (!sheet) return json({ ok: true });
    const rows = sheet.getDataRange().getValues();
    const to   = (data.myPlayer    || '').toString().trim().toUpperCase();
    const from = (data.otherPlayer || '').toString().trim().toUpperCase();
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][2]||'').toString().trim().toUpperCase() === to &&
          (rows[i][1]||'').toString().trim().toUpperCase() === from &&
          rows[i][5] !== 'true') {
        sheet.getRange(i + 1, 6).setValue('true');
      }
    }
    return json({ ok: true });
  }

  if (data.action === 'createClub') {
    let sheet = ss.getSheetByName('CLUBS');
    if (!sheet) {
      sheet = ss.insertSheet('CLUBS');
      sheet.appendRow(['clubId','name','description','location','photoUrl','createdBy','createdAt']);
    }
    const clubId = Utilities.getUuid();
    sheet.appendRow([clubId, data.name||'', data.description||'', data.location||'', data.photoUrl||'', data.createdBy||'', new Date().toISOString()]);
    let membersSheet = ss.getSheetByName('CLUB_MEMBERS');
    if (!membersSheet) {
      membersSheet = ss.insertSheet('CLUB_MEMBERS');
      membersSheet.appendRow(['clubId','playerName','joinedAt']);
    }
    if (data.createdBy) membersSheet.appendRow([clubId, data.createdBy, new Date().toISOString()]);
    return json({ ok: true, clubId });
  }

  if (data.action === 'joinClub') {
    let sheet = ss.getSheetByName('CLUB_MEMBERS');
    if (!sheet) {
      sheet = ss.insertSheet('CLUB_MEMBERS');
      sheet.appendRow(['clubId','playerName','joinedAt']);
    }
    const rows = sheet.getDataRange().getValues();
    const cid = data.clubId;
    const pname = (data.playerName || '').toString().trim().toUpperCase();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === cid && (rows[i][1]||'').toString().trim().toUpperCase() === pname) {
        return json({ ok: true, already: true });
      }
    }
    sheet.appendRow([cid, data.playerName, new Date().toISOString()]);
    return json({ ok: true });
  }

  if (data.action === 'leaveClub') {
    const sheet = ss.getSheetByName('CLUB_MEMBERS');
    if (!sheet) return json({ ok: false });
    const rows = sheet.getDataRange().getValues();
    const cid = data.clubId;
    const pname = (data.playerName || '').toString().trim().toUpperCase();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === cid && (rows[i][1]||'').toString().trim().toUpperCase() === pname) {
        sheet.deleteRow(i + 1);
        return json({ ok: true });
      }
    }
    return json({ ok: false });
  }

  // Default: submit match
  const sheet = ss.getSheetByName('SCORESHEET');
  const matchId = sheet.getLastRow();
  const team1 = (data.team1 || '').toUpperCase().trim();
  const team2 = (data.team2 || '').toUpperCase().trim();
  const team1Score = Number(data.team1Score) || 0;
  const team2Score = Number(data.team2Score) || 0;
  const win = team1Score > team2Score ? team1 : team2;
  const loss = team1Score > team2Score ? team2 : team1;
  const players = [...new Set([...team1.split('/').map(p=>p.trim()), ...team2.split('/').map(p=>p.trim())])].join('/');
  sheet.appendRow([matchId, data.date||'', data.bracket||'COMPETITIVE', (data.type||'').toUpperCase(), team1, team2, win, loss, team1Score, team2Score, players]);
  updateElo();
  return json({ matchId });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function dynamicK(playerElo) {
  if (playerElo < 1000) return 40;
  if (playerElo < 1400) return 20;
  return 10;
}

function expected(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }

function movMultiplier(margin, exp1) {
  const c = 1 - Math.abs(exp1 - 0.5) * 2;
  return 1 + margin * 0.05 * c;
}

function handleSingles(elo, p1, p2, p1Won, margin) {
  const e1 = elo[p1]||1000, e2 = elo[p2]||1000;
  const exp1 = expected(e1, e2), mov = movMultiplier(margin, exp1);
  elo[p1] = (elo[p1]||1000) + dynamicK(e1) * mov * ((p1Won?1:0) - exp1);
  elo[p2] = (elo[p2]||1000) + dynamicK(e2) * mov * ((p1Won?0:1) - (1-exp1));
}

function handleDoubles(elo, t1, t2, t1Won, margin) {
  const avg1 = t1.reduce((s,p)=>s+(elo[p]||1000),0)/t1.length;
  const avg2 = t2.reduce((s,p)=>s+(elo[p]||1000),0)/t2.length;
  const exp1 = expected(avg1, avg2), mov = movMultiplier(margin, exp1);
  const o1 = mov*((t1Won?1:0)-exp1), o2 = mov*((t1Won?0:1)-(1-exp1));
  function apply(team, outcome) {
    if (team.length < 2) { team.forEach(p=>{elo[p]=(elo[p]||1000)+dynamicK(elo[p]||1000)*outcome;}); return; }
    const es=team.map(p=>elo[p]||1000), hi=Math.max(...es), lo=Math.min(...es), prop=lo>0?hi/lo:1;
    team.forEach(p=>{const pe=elo[p]||1000,ch=dynamicK(pe)*outcome; elo[p]=pe+(pe>=hi?ch:ch>0?ch*prop:ch/prop);});
  }
  apply(t1,o1); apply(t2,o2);
}

function updateElo() {
  // Prevent concurrent runs — two simultaneous submissions would otherwise
  // both clear and rewrite the ELO sheet, producing duplicate rows.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return; // give up after 10s rather than crashing

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const rows = ss.getSheetByName('SCORESHEET').getDataRange().getValues();
    const sElo={}, dElo={};
    for (let i=1;i<rows.length;i++) {
      const row=rows[i];
      if (!row[0]||!row[3]) continue;
      if ((row[2]||'').toString().trim().toUpperCase()==='CASUAL') continue;
      const type=(row[3]||'').toString().trim().toUpperCase();
      const t1=(row[4]||'').toString().trim().toUpperCase().split('/').map(p=>p.trim()).filter(Boolean);
      const t2=(row[5]||'').toString().trim().toUpperCase().split('/').map(p=>p.trim()).filter(Boolean);
      const win=(row[6]||'').toString().trim().toUpperCase();
      if (!t1.length||!t2.length) continue;
      const margin=Math.abs((Number(row[8])||0)-(Number(row[9])||0));
      const t1Won=win===t1.join('/') || (t1.length===1&&win===t1[0]);
      if (type==='SINGLES') {
        if (!sElo[t1[0]]) sElo[t1[0]]=1000; if (!sElo[t2[0]]) sElo[t2[0]]=1000;
        handleSingles(sElo,t1[0],t2[0],t1Won,margin);
      } else if (type==='DOUBLES') {
        [...t1,...t2].forEach(p=>{if(!dElo[p])dElo[p]=1000;});
        handleDoubles(dElo,t1,t2,t1Won,margin);
      }
    }
    const eloSheet = ss.getSheetByName('ELO')||ss.insertSheet('ELO');
    eloSheet.clear(); // clear() removes content AND formatting, ensuring no stale rows remain
    eloSheet.appendRow(['Singles Player','Singles ELO','','Doubles Player','Doubles ELO']);
    const sArr=Object.entries(sElo).sort((a,b)=>b[1]-a[1]);
    const dArr=Object.entries(dElo).sort((a,b)=>b[1]-a[1]);
    for (let i=0;i<Math.max(sArr.length,dArr.length);i++) {
      const s=sArr[i]||['','']; const d=dArr[i]||['',''];
      eloSheet.appendRow([s[0],s[1]?Math.round(s[1]):'','',d[0],d[1]?Math.round(d[1]):'']);
    }
  } finally {
    lock.releaseLock();
  }
}

function autoUpdate(e) {
  if (e&&e.source&&e.source.getActiveSheet().getName()==='SCORESHEET') updateElo();
}
