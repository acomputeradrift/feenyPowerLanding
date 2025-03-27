import { generatePaginatedPDF } from './utils/downloadLogs.js';

let processedLogs = [];
let displayedLogs = [];
let currentMatches = [];
let currentMatchIndex = 0;


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

    //processedLogs = await response.json();
    const { logs, originalFilename } = await response.json();
    processedLogs = logs;



    if (!Array.isArray(processedLogs) || processedLogs.length === 0) {
      throw new Error('No log entries available.');
    }
    console.log('🧠 processedLogs preview:', processedLogs.slice(0, 5));
    renderLog(processedLogs);
    
  } catch (err) {
    console.error('❌ Error displaying log:', err);
    noFileMessage.textContent = 'Failed to load processed log.';
    noFileMessage.style.display = 'block';
    logContainer.style.display = 'none';
  }
  document.getElementById('downloadButton').addEventListener('click', () => {
    console.log('⬇️ Download triggered');
    
    const find = document.getElementById('findInput').value.trim();
    const keyword = document.getElementById('searchInput').value.trim();
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
  
    const filters = { findTerm: find, keyword, startTime: start, endTime: end };
  
    // ✅ Use already filtered and find-processed array
    console.log('📦 Exporting displayedLogs:', displayedLogs.slice(0, 3));
  
    generatePaginatedPDF(displayedLogs, filters, originalFilename);
  });
    
  document.getElementById('findButton').addEventListener('click', runFilterAndFind);
  document.getElementById('searchButton').addEventListener('click', runFilterAndFind);
  document.getElementById('clearFiltersButton').addEventListener('click', () => {
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('searchInput').value = '';
    runFilterAndFind(); // ✅ same logic
  });
  document.getElementById('clearFindButton').addEventListener('click', () => {
    document.getElementById('findInput').value = '';
    runFilterAndFind(); // ✅ unified logic
  });
  
  document.getElementById('findNextButton').addEventListener('click', () => {
    if (currentMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
    focusCurrentMatch();
  });
  document.getElementById('findPrevButton').addEventListener('click', () => {
    if (currentMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
    focusCurrentMatch();
  });
  
});

function renderLog(logArray) {
    displayedLogs = logArray; // ✅ Always update the current view
    console.log(`🔄 renderLog called — displaying ${displayedLogs.length} entries`);
    console.log('📄 displayedLogs preview:', displayedLogs.slice(0, 5));
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';
  
    logArray.forEach(entry => {
      const div = document.createElement('div');
      if (entry.class) div.classList.add(entry.class);
      div.textContent = `[ID: ${entry.id}] [${entry.time}] ${entry.text}`;
      logContainer.appendChild(div);
    });
  
    logContainer.style.display = 'block';
    document.getElementById('logNoFileMessage').style.display = 'none';
    const scrollContainer = document.querySelector('.processed-logs-display');
    scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
    applyFind();
  }
  
  function applyFind() {
    console.log('🔎 applyFind called');
    const findTerm = document.getElementById('findInput').value.trim();
    currentMatches = [];
    currentMatchIndex = 0;
  
    const logContainer = document.getElementById('logContainer');
    const entries = logContainer.querySelectorAll('div');
  
    entries.forEach(div => {
      div.innerHTML = div.textContent;
      div.classList.remove('active-match');
    });
  
    if (!findTerm) {
      document.getElementById('findCounter').textContent = '';
      return;
    }
  
    entries.forEach((div, i) => {
      const entry = displayedLogs[i]; // sync by index
      if (entry.text.includes(findTerm)) {
        const regex = new RegExp(`(${findTerm})`, 'g');
        div.innerHTML = div.textContent.replace(regex, '<mark>$1</mark>');
        currentMatches.push(div);
      }
    });
  
    updateFindCounter();
    focusCurrentMatch();
  }
  
// function applyFind() {
//   console.log('applyFind called');
//   const findTerm = document.getElementById('findInput').value.trim();
//   currentMatches = [];
//   currentMatchIndex = 0;

//   // Always clear old highlights
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

//   entries.forEach(div => {
//     const text = div.textContent;
//     if (text.includes(findTerm)) {
//       const regex = new RegExp(`(${findTerm})`, 'g'); // exact match, case-sensitive
//       div.innerHTML = div.textContent.replace(regex, '<mark>$1</mark>');
//       currentMatches.push(div);
//     }
//   });
//   updateFindCounter();
//   focusCurrentMatch(); // ✅ will scroll and highlight exactly 1 entry
// }

  
function focusCurrentMatch() {
  console.log('focusCurrentMatch called');
  if (currentMatches.length === 0) return;

  // Remove previous highlights
  currentMatches.forEach(div => div.classList.remove('active-match'));

  const match = currentMatches[currentMatchIndex];
  match.classList.add('active-match');

  const scrollContainer = document.querySelector('.processed-logs-display');
  const lineHeight = match.offsetHeight || 20; // Fallback if height unknown
  const offset = lineHeight * 5;

  const targetScrollTop = Math.max(match.offsetTop - offset, 0);
  scrollContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
  updateFindCounter();

  // ✅ Diagnostic log to confirm offset behavior
  setTimeout(() => {
    const matchTop = match.getBoundingClientRect().top;
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const actualOffset = Math.round(matchTop - containerTop);
    const expectedOffset = Math.round(offset);
    console.log(`[FocusCheck] Match is ${actualOffset}px from top — expected ~${expectedOffset}px`);
  }, 400); // Give scroll a moment to settle
}
  
  function updateFindCounter() {
    console.log('updateFindCounter called');
    const counter = document.getElementById('findCounter');
    if (currentMatches.length === 0) {
      counter.textContent = '';
    } else {
      counter.textContent = `${currentMatchIndex + 1} of ${currentMatches.length}`;
    }
  }
  
  function clearFindHighlighting() {
    console.log('clearFindHighlighting called');
    const entries = document.getElementById('logContainer').querySelectorAll('div');
    entries.forEach(div => {
      div.innerHTML = div.textContent; // remove <mark>
      div.classList.remove('active-match'); // remove outline
    });
  
    document.getElementById('findCounter').textContent = '';
    currentMatches = [];
    currentMatchIndex = 0;
  }
  
  function nextFindMatch() {
    console.log('nextFindMatch called');
    if (currentMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
    focusCurrentMatch();
  }
  function prevFindMatch() {
    console.log('prevFindMatch called');
    if (currentMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
    focusCurrentMatch();
  }
  
    
  function runFilterAndFind() {
    console.log('runFilterAndFind called');
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    const keyword = document.getElementById('searchInput').value.trim();
    const findTerm = document.getElementById('findInput').value.trim();
  
    currentMatches = [];
    currentMatchIndex = 0;
  
    const filteredLogs = processedLogs.filter(entry => {
      const timeOK = (!start || entry.time >= start) && (!end || entry.time <= end);
      const keywordOK = !keyword || entry.text.includes(keyword);
      return timeOK && keywordOK;
    });
    console.log(`🔍 Filtered result: ${filteredLogs.length} entries`);
    console.log('📄 filteredLogs preview:', filteredLogs.slice(0, 5));
    renderLog(filteredLogs); // This calls applyFind() which uses the findInput box
  }
  


  