import { parse, addDays, subDays } from 'date-fns';

export function reconstructFullTimestamps(logs) {
  //console.log('📅 Reconstructing timestamps — total logs:', logs.length);
  if (!Array.isArray(logs)) return logs;

  const anchorIndex = logs.findIndex(entry =>
    entry.text?.includes('Clock: UpdateTimeSysVars at')
  );

  //console.log('📍 Anchor index found at:', anchorIndex);

  if (anchorIndex === -1) {
    console.log('❌ No date anchor found.');
    return logs;
  }

  const anchorEntry = logs[anchorIndex];
  const dateMatch = anchorEntry.text.match(
    /at\s+\w+\s+(\w+\s+\d+\s+\d{4})\s+(\d{2}:\d{2}:\d{2})/
  );

  if (!dateMatch) {
    console.log('❌ Date match failed on anchor entry.');
    return logs;
  }

  const [ , dateStr, timeStr ] = dateMatch;
  const baseDate = parse(`${dateStr} ${timeStr}`, 'MMM dd yyyy HH:mm:ss', new Date());

  logs[anchorIndex].fullTimestamp = toISO(anchorEntry.time, baseDate);
  //console.log('✅ Anchor fullTimestamp:', logs[anchorIndex].fullTimestamp);

  // FORWARD
  let currentDate = baseDate;
  for (let i = anchorIndex + 1; i < logs.length; i++) {
    const thisTime = logs[i].time;
    const prevTime = logs[i - 1].time;

    const thisHour = parse(thisTime, 'HH:mm:ss.SSS', new Date()).getHours();
    const prevHour = parse(prevTime, 'HH:mm:ss.SSS', new Date()).getHours();

    if (prevHour > 22 && thisHour < 2) {
      //console.log(`⏭️  [${i}] Time crossed midnight forward — incrementing day`);
      currentDate = addDays(currentDate, 1);
    }

    logs[i].fullTimestamp = toISO(thisTime, currentDate);

    // Check against embedded timestamp in text (System Manager entries)
    // if (logs[i].text?.includes('Clock: UpdateTimeSysVars at')) {
    //   compareTimestamps(i, logs[i]);
    // }
  }

  // BACKWARD
  currentDate = baseDate;
  for (let i = anchorIndex - 1; i >= 0; i--) {
    const thisTime = logs[i].time;
    const nextTime = logs[i + 1].time;

    const thisHour = parse(thisTime, 'HH:mm:ss.SSS', new Date()).getHours();
    const nextHour = parse(nextTime, 'HH:mm:ss.SSS', new Date()).getHours();

    if (thisHour > 22 && nextHour < 2) {
      //console.log(`⏮️  [${i}] Time crossed midnight backward — decrementing day`);
      currentDate = subDays(currentDate, 1);
    }

    logs[i].fullTimestamp = toISO(thisTime, currentDate);

    // Check against embedded timestamp in text (System Manager entries)
    if (logs[i].text?.includes('Clock: UpdateTimeSysVars at')) {
      compareTimestamps(i, logs[i]);
    }
  }

  console.log('✅ Timestamp reconstruction complete.');
  return logs;
}

function toISO(timeStr, dateObj) {
  const [h, m, sMs] = timeStr.split(':');
  const [s, ms] = sMs.split('.');
  const full = new Date(dateObj);
  full.setHours(+h, +m, +s, +ms);
  return full.toISOString(); // e.g. "2025-03-04T16:33:00.989Z"
}

function compareTimestamps(index, entry) {
  const match = entry.text.match(
    /at\s+\w+\s+(\w+\s+\d+\s+\d{4})\s+(\d{2}:\d{2}:\d{2})/
  );
  if (match) {
    const [ , dateStr, timeStr ] = match;
    const expectedDate = parse(`${dateStr} ${timeStr}`, 'MMM dd yyyy HH:mm:ss', new Date());
    const expectedISO = expectedDate.toISOString();
    const actualISO = entry.fullTimestamp;

    console.log('🧪 TIMESTAMP CHECK');
    console.log(`📍 Entry [${index}]`);
    console.log('📦 Expected (from log text):', expectedISO);
    console.log('📌 Calculated fullTimestamp:', actualISO);
    if (expectedISO !== actualISO) {
      console.warn('⚠️ MISMATCH in timestamp logic!');
    }
  }
}


