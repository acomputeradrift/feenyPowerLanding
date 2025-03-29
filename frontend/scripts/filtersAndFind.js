export const findFilterState = {
    currentMatches: [],
    currentMatchIndex: 0,
    displayedLogs: [],
    processedLogs: [],
  };
    
export function updateFindCounter() {
    const counter = document.getElementById('findCounter');
    const matches = findFilterState.currentMatches;
    const matchIndex = findFilterState.currentMatchIndex;
    if (matches.length === 0) {
        counter.textContent = '';
    } else {
        counter.textContent = `${matchIndex + 1} of ${matches.length}`;
    }
}
  
  
export function clearFindHighlighting() {
    const entries = document.getElementById('logContainer').querySelectorAll('div');
    entries.forEach(div => {
        div.innerHTML = div.textContent; // remove highlights (<mark>)
        div.classList.remove('active-match'); // remove active highlight class
    });

    document.getElementById('findCounter').textContent = '';

    // ✅ explicitly reset the state using your new object
    findFilterState.currentMatches = [];
    findFilterState.currentMatchIndex = 0;
}
  
