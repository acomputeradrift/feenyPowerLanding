import { parse, addDays, subDays, isBefore } from 'date-fns';

export function reconstructFullTimestamps(logs) {
  console.log('📅 Reconstructing timestamps — total logs:', logs.length);
  if (!Array.isArray(logs)) return logs;

  const anchorIndex = logs.findIndex(entry =>
    entry.text?.includes('Clock: UpdateTimeSysVars at')
  );

  if (anchorIndex !== -1) {
    console.log('📍 Anchor index found at:', anchorIndex);
    return reconstructWithAnchor(logs, anchorIndex);
  } else {
    console.log('⚠️ No anchor found. Falling back to download_time.');
    return reconstructWithDownloadTime(logs);
  }
}

// export function reconstructFullTimestamps(logs) {
//   console.log('📅 Reconstructing timestamps — total logs:', logs.length);
//   if (!Array.isArray(logs)) return logs;

//   const anchorIndex = logs.findIndex(entry =>
//     entry.text?.includes('Clock: UpdateTimeSysVars at')
//   );

//   console.log('📍 Anchor index found at:', anchorIndex);

//   if (anchorIndex === -1) {
//     console.log('❌ No date anchor found.');
//     return logs;
//   }

//   const anchorEntry = logs[anchorIndex];
//   const dateMatch = anchorEntry.text.match(
//     /at\s+\w+\s+(\w+\s+\d+\s+\d{4})\s+(\d{2}:\d{2}:\d{2})/
//   );

//   if (!dateMatch) {
//     console.log('❌ Date match failed on anchor entry.');
//     return logs;
//   }

//   const [ , dateStr, timeStr ] = dateMatch;
//   const baseDate = parse(`${dateStr} ${timeStr}`, 'MMM dd yyyy HH:mm:ss', new Date());

//   logs[anchorIndex].fullTimestamp = toISO(anchorEntry.time, baseDate);
//   console.log('✅ Anchor fullTimestamp:', logs[anchorIndex].fullTimestamp);

//   // FORWARD
//   let currentDate = baseDate;
//   for (let i = anchorIndex + 1; i < logs.length; i++) {
//     const thisTime = logs[i].time;
//     const prevTime = logs[i - 1].time;

//     const thisHour = parse(thisTime, 'HH:mm:ss.SSS', new Date()).getHours();
//     const prevHour = parse(prevTime, 'HH:mm:ss.SSS', new Date()).getHours();

//     if (prevHour > 22 && thisHour < 2) {
//       console.log(`⏭️  [${i}] Time crossed midnight forward — incrementing day`);
//       currentDate = addDays(currentDate, 1);
//     }

//     logs[i].fullTimestamp = toISO(thisTime, currentDate);

//     // Check against embedded timestamp in text (System Manager entries)
//     // if (logs[i].text?.includes('Clock: UpdateTimeSysVars at')) {
//     //   compareTimestamps(i, logs[i]);
//     // }
//   }

//   // BACKWARD
//   currentDate = baseDate;
//   for (let i = anchorIndex - 1; i >= 0; i--) {
//     const thisTime = logs[i].time;
//     const nextTime = logs[i + 1].time;

//     const thisHour = parse(thisTime, 'HH:mm:ss.SSS', new Date()).getHours();
//     const nextHour = parse(nextTime, 'HH:mm:ss.SSS', new Date()).getHours();

//     if (thisHour > 22 && nextHour < 2) {
//       console.log(`⏮️  [${i}] Time crossed midnight backward — decrementing day`);
//       currentDate = subDays(currentDate, 1);
//     }

//     logs[i].fullTimestamp = toISO(thisTime, currentDate);

//     // Check against embedded timestamp in text (System Manager entries)
//     if (logs[i].text?.includes('Clock: UpdateTimeSysVars at')) {
//       compareTimestamps(i, logs[i]);
//     }
//   }

//   console.log('✅ Timestamp reconstruction complete.');
//   return logs;
// }

function reconstructWithAnchor(logs, anchorIndex) {
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
  console.log('✅ Anchor fullTimestamp:', logs[anchorIndex].fullTimestamp);

  // Forward
  let currentDate = baseDate;
  for (let i = anchorIndex + 1; i < logs.length; i++) {
    const thisTime = logs[i].time;
    const prevTime = logs[i - 1].time;
    const thisHour = parse(thisTime, 'HH:mm:ss.SSS', new Date()).getHours();
    const prevHour = parse(prevTime, 'HH:mm:ss.SSS', new Date()).getHours();

    if (prevHour > 22 && thisHour < 2) {
      console.log(`⏭️  [${i}] Time crossed midnight forward — incrementing day`);
      currentDate = addDays(currentDate, 1);
    }

    logs[i].fullTimestamp = toISO(thisTime, currentDate);
  }

  // Backward
  currentDate = baseDate;
  for (let i = anchorIndex - 1; i >= 0; i--) {
    const thisTime = logs[i].time;
    const nextTime = logs[i + 1].time;
    const thisHour = parse(thisTime, 'HH:mm:ss.SSS', new Date()).getHours();
    const nextHour = parse(nextTime, 'HH:mm:ss.SSS', new Date()).getHours();

    if (thisHour > 22 && nextHour < 2) {
      console.log(`⏮️  [${i}] Time crossed midnight backward — decrementing day`);
      currentDate = subDays(currentDate, 1);
    }

    logs[i].fullTimestamp = toISO(thisTime, currentDate);

    if (logs[i].text?.includes('Clock: UpdateTimeSysVars at')) {
      compareTimestamps(i, logs[i]);
    }
  }

  console.log('✅ Timestamp reconstruction complete using anchor.');
  return logs;
}

function reconstructWithDownloadTime(logs) {
  console.log('🔍 logs[0] =', JSON.stringify(logs[0], null, 2));

  //const systemStatusLog = logs.find(log => log.systemStatus?.download_time);
  const systemStatusLog = logs[0]?.systemStatus?.download_time ? logs[0] : null;

  if (!systemStatusLog) {
    console.log('❌ No download_time found in systemStatus.');
    return logs;
  }

  const downloadTimeStr = systemStatusLog.systemStatus.download_time;
  const downloadDate = parse(downloadTimeStr.slice(0, 19), 'yyyy-MM-dd HH:mm:ss', new Date());

  let currentDate = downloadDate;

  // Backward scan to estimate dates
  for (let i = logs.length - 2; i >= 0; i--) {
    const thisTime = logs[i].time;
    const nextTime = logs[i + 1].time;
    const thisHour = parse(thisTime, 'HH:mm:ss.SSS', new Date()).getHours();
    const nextHour = parse(nextTime, 'HH:mm:ss.SSS', new Date()).getHours();

    if (thisHour > 22 && nextHour < 2) {
      console.log(`⏮️  [${i}] Time crossed midnight backward — decrementing day`);
      currentDate = subDays(currentDate, 1);
    }

    logs[i].approxDate = new Date(currentDate); // temp field
  }

  // Forward pass assigning final timestamps
  currentDate = logs[0].approxDate;
  logs[0].fullTimestamp = toISO(logs[0].time, currentDate);

  for (let i = 1; i < logs.length; i++) {
    const thisTime = logs[i].time;
    const prevTime = logs[i - 1].time;
    const thisHour = parse(thisTime, 'HH:mm:ss.SSS', new Date()).getHours();
    const prevHour = parse(prevTime, 'HH:mm:ss.SSS', new Date()).getHours();

    if (prevHour > 22 && thisHour < 2) {
      console.log(`⏭️  [${i}] Time crossed midnight forward — incrementing day`);
      currentDate = addDays(currentDate, 1);
    }

    logs[i].fullTimestamp = toISO(thisTime, currentDate);
  }

  console.log('✅ Timestamp reconstruction complete using download_time.');
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


