export const filterState = {
    // currentMatches: [],
    // currentMatchIndex: 0,
    displayedLogs: [],
    processedLogs: [],
  };

  export function runFilterLogs(renderLog) {
    console.log('filterLogs called');
  
    const startInput = document.getElementById('startTime').value;
    const endInput = document.getElementById('endTime').value;
    const keyword = document.getElementById('searchInput').value.trim();
  
    const startDate = startInput ? new Date(startInput) : null;
    const endDate = endInput ? new Date(endInput) : null;
  
    const filteredLogs = filterState.processedLogs.filter(entry => {
      const logDate = new Date(entry.time);
      const timeOK = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
      const keywordOK = !keyword || entry.text.includes(keyword);
      return timeOK && keywordOK;
    });
  
    console.log(`🔍 Filtered result: ${filteredLogs.length} entries`);
    console.log('📄 filteredLogs preview:', filteredLogs.slice(0, 5));
  
    // renderLog now simply renders filtered logs, no find highlighting needed
    renderLog(filteredLogs);
  }

  export function updateRecordCount() {
    console.log('🔎 updateRecordCount called');
    const countElement = document.getElementById('recordCountDisplay');
    countElement.textContent = `Total Records: ${filterState.displayedLogs.length}`;
  }
  
//-------------------------------------------------Find  
    
// export function runFilterAndFind(renderLog) {
//     console.log('runFilterAndFind called');
  
//     const startInput = document.getElementById('startTime').value;
//     const endInput = document.getElementById('endTime').value;
//     const keyword = document.getElementById('searchInput').value.trim();
//     //const findTerm = document.getElementById('findInput').value.trim();
  
//     findFilterState.currentMatches = [];
//     findFilterState.currentMatchIndex = 0;
  
//     const startDate = startInput ? new Date(startInput) : null;
//     const endDate = endInput ? new Date(endInput) : null;
  
//     const filteredLogs = findFilterState.processedLogs.filter(entry => {
//       const logDate = new Date(entry.time); // entry.time is now full formatted timestamp
//       const timeOK = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
//       const keywordOK = !keyword || entry.text.includes(keyword);
//       return timeOK && keywordOK;
//     });
  
//     console.log(`🔍 Filtered result: ${filteredLogs.length} entries`);
//     console.log('📄 filteredLogs preview:', filteredLogs.slice(0, 5));
//     renderLog(filteredLogs); // This calls applyFind() which uses the findInput box
//   }

// export function applyFind() {
//     console.log('🔎 applyFind called');
//     updateRecordCount();
//     const findTerm = document.getElementById('findInput').value.trim();
//     findFilterState.currentMatches = [];
//     findFilterState.currentMatchIndex = 0;
  
//     const logContainer = document.getElementById('logContainer');
//     const entries = logContainer.querySelectorAll('div');
  
//     entries.forEach(div => {
//       div.innerHTML = div.textContent;
//       div.classList.remove('active-match');
//     });
  
//     if (!findTerm) {
//       document.getElementById('findCounter').textContent = '';
//       return;
//     }
  
//     entries.forEach((div, i) => {
//       const entry = findFilterState.displayedLogs[i]; // sync by index
//       if (entry.text.includes(findTerm)) {
//         const regex = new RegExp(`(${findTerm})`, 'g');
//         div.innerHTML = div.textContent.replace(regex, '<mark>$1</mark>');
//         findFilterState.currentMatches.push(div);
//       }
//     });
//     console.log('About to call updateRecordCount, findFilterState.displayedLogs length:', findFilterState.displayedLogs.length);
//     updateFindCounter();
//     focusCurrentMatch();
//   }

// export function updateFindCounter() {
//     const counter = document.getElementById('findCounter');
//     const matches = findFilterState.currentMatches;
//     const matchIndex = findFilterState.currentMatchIndex;
//     if (matches.length === 0) {
//         counter.textContent = '';
//     } else {
//         counter.textContent = `${matchIndex + 1} of ${matches.length}`;
//     }
// }


  
// export function clearFindHighlighting() {
//     const entries = document.getElementById('logContainer').querySelectorAll('div');
//     entries.forEach(div => {
//         div.innerHTML = div.textContent; // remove highlights (<mark>)
//         div.classList.remove('active-match'); // remove active highlight class
//     });

//     document.getElementById('findCounter').textContent = '';

//     // ✅ explicitly reset the state using your new object
//     findFilterState.currentMatches = [];
//     findFilterState.currentMatchIndex = 0;
// }
  
// export function nextFindMatch() {
//     console.log('nextFindMatch called');
//     if (findFilterState.currentMatches.length === 0) return;
//     findFilterState.currentMatchIndex = (findFilterState.currentMatchIndex + 1) % findFilterState.currentMatches.length;
//     focusCurrentMatch();
//   }
  
// export function prevFindMatch() {
//     console.log('prevFindMatch called');
//     if (findFilterState.currentMatches.length === 0) return;
//     findFilterState.currentMatchIndex = (findFilterState.currentMatchIndex - 1 + findFilterState.currentMatches.length) % findFilterState.currentMatches.length;
//     focusCurrentMatch();
// }

// export function focusCurrentMatch() {
//     console.log('focusCurrentMatch called');
//     if (findFilterState.currentMatches.length === 0) return;
  
//     // Remove previous highlights
//     findFilterState.currentMatches.forEach(div => div.classList.remove('active-match'));
  
//     const match = findFilterState.currentMatches[findFilterState.currentMatchIndex];
//     match.classList.add('active-match');
  
//     const scrollContainer = document.querySelector('.processed-logs-display');
//     const lineHeight = match.offsetHeight || 20; // Fallback if height unknown
//     const offset = lineHeight * 5;
  
//     const targetScrollTop = Math.max(match.offsetTop - offset, 0);
//     scrollContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
//     updateFindCounter();
  
//     // ✅ Diagnostic log to confirm offset behavior
//     setTimeout(() => {
//       const matchTop = match.getBoundingClientRect().top;
//       const containerTop = scrollContainer.getBoundingClientRect().top;
//       const actualOffset = Math.round(matchTop - containerTop);
//       const expectedOffset = Math.round(offset);
//       console.log(`[FocusCheck] Match is ${actualOffset}px from top — expected ~${expectedOffset}px`);
//     }, 400); // Give scroll a moment to settle
//   }
