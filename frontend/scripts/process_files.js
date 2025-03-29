import { generatePaginatedPDF } from './utils/downloadLogs.js';
import { setDateTimeInputsToLogRange } from './utils/setDateTimeInputs.js';
import {
  findFilterState,
  updateFindCounter,
  clearFindHighlighting,
  focusCurrentMatch,
  nextFindMatch,
  prevFindMatch, 
  applyFind,
  runFilterAndFind
} from './filtersAndFind.js';


let filename ='';

document.addEventListener('DOMContentLoaded', async () => {
  const logContainer = document.getElementById('logContainer');
  const noFileMessage = document.getElementById('logNoFileMessage');

  try {
    const response = await fetch('/api/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    if (!response.ok) throw new Error('Failed to fetch processed log');

    const { logs, originalFilename } = await response.json();
    findFilterState.processedLogs = logs;
    filename = originalFilename;
    setDateTimeInputsToLogRange(findFilterState.processedLogs);
  
    if (!Array.isArray(findFilterState.processedLogs) || findFilterState.processedLogs.length === 0) {
      throw new Error('No log entries available.');
    }
    console.log('🧠 findFilterState.processedLogs preview:', findFilterState.processedLogs.slice(0, 5));
    renderLog(findFilterState.processedLogs);
    
  } catch (err) {
    console.error('❌ Error displaying log:', err);
    noFileMessage.textContent = 'Failed to load processed log.';
    noFileMessage.style.display = 'block';
    logContainer.style.display = 'none';
  }
  document.getElementById('downloadButton').addEventListener('click', () => {
    // console.log('⬇️ Download triggered');
    
    const find = document.getElementById('findInput').value.trim();
    const keyword = document.getElementById('searchInput').value.trim();
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
  
    const filters = { findTerm: find, keyword, startTime: start, endTime: end };
  
    // ✅ Use already filtered and find-processed array
    // console.log('📦 Exporting findFilterState.displayedLogs:', findFilterState.displayedLogs.slice(0, 3));
    // console.log(`Original FileName: ${filename}`);
    generatePaginatedPDF(findFilterState.displayedLogs, filters, filename);
  });
  
  document.getElementById('searchButton').addEventListener('click', () => runFilterAndFind(renderLog));

  document.getElementById('clearFiltersButton').addEventListener('click', () => {
    setDateTimeInputsToLogRange(findFilterState.processedLogs);
    document.getElementById('searchInput').value = '';
    runFilterAndFind(renderLog);
  });
  
  document.getElementById('clearFindButton').addEventListener('click', () => {
    document.getElementById('findInput').value = '';
    runFilterAndFind(renderLog);
  });
  
  // document.getElementById('findButton').addEventListener('click', runFilterAndFind(renderLog));
  // document.getElementById('searchButton').addEventListener('click', runFilterAndFind(renderLog));
  // document.getElementById('clearFiltersButton').addEventListener('click', () => {
  //   setDateTimeInputsToLogRange(findFilterState.processedLogs); // ✅ explicitly reset datetime inputs
  //   document.getElementById('searchInput').value = '';
  //   runFilterAndFind(renderLog); // ✅ same logic
  // });
  
  // document.getElementById('clearFindButton').addEventListener('click', () => {
  //   document.getElementById('findInput').value = '';
  //   runFilterAndFind(renderLog); // ✅ unified logic
  // });
  
  document.getElementById('findNextButton').addEventListener('click', () => {
    if (findFilterState.currentMatches.length === 0) return;
    findFilterState.currentMatchIndex = (findFilterState.currentMatchIndex + 1) % findFilterState.currentMatches.length;
    focusCurrentMatch();
  });
  document.getElementById('findPrevButton').addEventListener('click', () => {
    if (findFilterState.currentMatches.length === 0) return;
    findFilterState.currentMatchIndex = (findFilterState.currentMatchIndex - 1 + findFilterState.currentMatches.length) % findFilterState.currentMatches.length;
    focusCurrentMatch();
  });
  
});

function renderLog(logArray) {
    findFilterState.displayedLogs = logArray; // ✅ Always update the current view
    console.log(`🔄 renderLog called — displaying ${findFilterState.displayedLogs.length} entries`);
    console.log('📄 findFilterState.displayedLogs preview:', findFilterState.displayedLogs.slice(0, 5));
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';
  
    logArray.forEach(entry => {
      const div = document.createElement('div');
      if (entry.class) div.classList.add(entry.class);
      div.textContent = `[${entry.time}] ${entry.text}`;
      logContainer.appendChild(div);
    });
  
    logContainer.style.display = 'block';
    document.getElementById('logNoFileMessage').style.display = 'none';
    const scrollContainer = document.querySelector('.processed-logs-display');
    scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
    applyFind();
  }
  
  // function applyFind() {
  //   console.log('🔎 applyFind called');
  //   updateRecordCount();
  //   const findTerm = document.getElementById('findInput').value.trim();
  //   findFilterState.currentMatches = [];
  //   findFilterState.currentMatchIndex = 0;
  
  //   const logContainer = document.getElementById('logContainer');
  //   const entries = logContainer.querySelectorAll('div');
  
  //   entries.forEach(div => {
  //     div.innerHTML = div.textContent;
  //     div.classList.remove('active-match');
  //   });
  
  //   if (!findTerm) {
  //     document.getElementById('findCounter').textContent = '';
  //     return;
  //   }
  
  //   entries.forEach((div, i) => {
  //     const entry = findFilterState.displayedLogs[i]; // sync by index
  //     if (entry.text.includes(findTerm)) {
  //       const regex = new RegExp(`(${findTerm})`, 'g');
  //       div.innerHTML = div.textContent.replace(regex, '<mark>$1</mark>');
  //       findFilterState.currentMatches.push(div);
  //     }
  //   });
  //   console.log('About to call updateRecordCount, findFilterState.displayedLogs length:', findFilterState.displayedLogs.length);
  //   updateFindCounter();
  //   focusCurrentMatch();
  // }
    
// function focusCurrentMatch() {
//   console.log('focusCurrentMatch called');
//   if (findFilterState.currentMatches.length === 0) return;

//   // Remove previous highlights
//   findFilterState.currentMatches.forEach(div => div.classList.remove('active-match'));

//   const match = findFilterState.currentMatches[findFilterState.currentMatchIndex];
//   match.classList.add('active-match');

//   const scrollContainer = document.querySelector('.processed-logs-display');
//   const lineHeight = match.offsetHeight || 20; // Fallback if height unknown
//   const offset = lineHeight * 5;

//   const targetScrollTop = Math.max(match.offsetTop - offset, 0);
//   scrollContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
//   updateFindCounter();

//   // ✅ Diagnostic log to confirm offset behavior
//   setTimeout(() => {
//     const matchTop = match.getBoundingClientRect().top;
//     const containerTop = scrollContainer.getBoundingClientRect().top;
//     const actualOffset = Math.round(matchTop - containerTop);
//     const expectedOffset = Math.round(offset);
//     console.log(`[FocusCheck] Match is ${actualOffset}px from top — expected ~${expectedOffset}px`);
//   }, 400); // Give scroll a moment to settle
// }
  
  // function updateFindCounter() {
  //   console.log('updateFindCounter called');
  //   const counter = document.getElementById('findCounter');
  //   if (findFilterState.currentMatches.length === 0) {
  //     counter.textContent = '';
  //   } else {
  //     counter.textContent = `${findFilterState.currentMatchIndex + 1} of ${findFilterState.currentMatches.length}`;
  //   }
  // }
  
  // function clearFindHighlighting() {
  //   console.log('clearFindHighlighting called');
  //   const entries = document.getElementById('logContainer').querySelectorAll('div');
  //   entries.forEach(div => {
  //     div.innerHTML = div.textContent; // remove <mark>
  //     div.classList.remove('active-match'); // remove outline
  //   });
  
  //   document.getElementById('findCounter').textContent = '';
  //   findFilterState.currentMatches = [];
  //   findFilterState.currentMatchIndex = 0;
  // }
  
  // function nextFindMatch() {
  //   console.log('nextFindMatch called');
  //   if (findFilterState.currentMatches.length === 0) return;
  //   findFilterState.currentMatchIndex = (findFilterState.currentMatchIndex + 1) % findFilterState.currentMatches.length;
  //   focusCurrentMatch();
  // }
  // function prevFindMatch() {
  //   console.log('prevFindMatch called');
  //   if (findFilterState.currentMatches.length === 0) return;
  //   findFilterState.currentMatchIndex = (findFilterState.currentMatchIndex - 1 + findFilterState.currentMatches.length) % findFilterState.currentMatches.length;
  //   focusCurrentMatch();
  // }
  
  // function runFilterAndFind() {
  //   console.log('runFilterAndFind called');
  
  //   const startInput = document.getElementById('startTime').value;
  //   const endInput = document.getElementById('endTime').value;
  //   const keyword = document.getElementById('searchInput').value.trim();
  //   const findTerm = document.getElementById('findInput').value.trim();
  
  //   findFilterState.currentMatches = [];
  //   findFilterState.currentMatchIndex = 0;
  
  //   const startDate = startInput ? new Date(startInput) : null;
  //   const endDate = endInput ? new Date(endInput) : null;
  
  //   const filteredLogs = findFilterState.processedLogs.filter(entry => {
  //     const logDate = new Date(entry.time); // entry.time is now full formatted timestamp
  //     const timeOK = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
  //     const keywordOK = !keyword || entry.text.includes(keyword);
  //     return timeOK && keywordOK;
  //   });
  
  //   console.log(`🔍 Filtered result: ${filteredLogs.length} entries`);
  //   console.log('📄 filteredLogs preview:', filteredLogs.slice(0, 5));
  //   renderLog(filteredLogs); // This calls applyFind() which uses the findInput box
  // }

  // function updateRecordCount() {
  //   console.log('🔎 updateRecordCount called');
  //   const countElement = document.getElementById('recordCountDisplay');
  //   countElement.textContent = `Total Records: ${findFilterState.displayedLogs.length}`;
  // }
