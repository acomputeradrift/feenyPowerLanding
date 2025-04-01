import { generatePaginatedPDF } from './utils/downloadLogs.js';
import { setDateTimeInputsToLogRange } from './utils/setDateTimeInputs.js';
import {
  filterState, 
  runFilterLogs
} from './filterLogs.js';


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
    filterState.processedLogs = logs;
    filename = originalFilename;
    setDateTimeInputsToLogRange(filterState.processedLogs);
  
    if (!Array.isArray(filterState.processedLogs) || filterState.processedLogs.length === 0) {
      throw new Error('No log entries available.');
    }
    console.log('🧠 filterState.processedLogs preview:', filterState.processedLogs.slice(0, 5));
    renderLog(filterState.processedLogs);
    
  } catch (err) {
    console.error('❌ Error displaying log:', err);
    noFileMessage.textContent = 'Failed to load processed log.';
    noFileMessage.style.display = 'block';
    logContainer.style.display = 'none';
  }
  document.getElementById('downloadButton').addEventListener('click', () => {
    // console.log('⬇️ Download triggered');
    
    //const find = document.getElementById('findInput').value.trim();
    const keyword = document.getElementById('searchInput').value.trim();
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
  
    const filters = { filterTerms: keyword, startTime: start, endTime: end };
  
    // ✅ Use already filtered and find-processed array
    // console.log('📦 Exporting filterState.displayedLogs:', filterState.displayedLogs.slice(0, 3));
    // console.log(`Original FileName: ${filename}`);
    generatePaginatedPDF(filterState.displayedLogs, filters, filename);
  });
  
  document.getElementById('searchButton').addEventListener('click', () => runFilterLogs(renderLog));

  document.getElementById('clearFiltersButton').addEventListener('click', () => {
    setDateTimeInputsToLogRange(filterState.processedLogs);
    document.getElementById('searchInput').value = '';
    runFilterAndFind(renderLog);
  });
  
  // document.getElementById('clearFindButton').addEventListener('click', () => {
  //   document.getElementById('findInput').value = '';
  //   runFilterAndFind(renderLog);
  // });
  
  // document.getElementById('findNextButton').addEventListener('click', () => {
  //   if (filterState.currentMatches.length === 0) return;
  //   filterState.currentMatchIndex = (filterState.currentMatchIndex + 1) % filterState.currentMatches.length;
  //   focusCurrentMatch();
  // });
  // document.getElementById('findPrevButton').addEventListener('click', () => {
  //   if (filterState.currentMatches.length === 0) return;
  //   filterState.currentMatchIndex = (filterState.currentMatchIndex - 1 + filterState.currentMatches.length) % filterState.currentMatches.length;
  //   focusCurrentMatch();
  // });
  
});

function renderLog(logArray) {
    filterState.displayedLogs = logArray; // ✅ Always update the current view
    console.log(`🔄 renderLog called — displaying ${filterState.displayedLogs.length} entries`);
    console.log('📄 filterState.displayedLogs preview:', filterState.displayedLogs.slice(0, 5));
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
    // const scrollContainer = document.querySelector('.processed-logs-display');
    // scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
    // applyFind();
  }
  
