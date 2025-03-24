let fullLogData = [];
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

    const processedLogs = await response.json();

    if (!Array.isArray(processedLogs) || processedLogs.length === 0) {
      throw new Error('No log entries available.');
    }

    fullLogData = processedLogs;
    renderLog(fullLogData);

  } catch (err) {
    console.error('❌ Error displaying log:', err);
    noFileMessage.textContent = 'Failed to load processed log.';
    noFileMessage.style.display = 'block';
    logContainer.style.display = 'none';
  }

  document.getElementById('searchButton').addEventListener('click', filterLogs);
  document.getElementById('clearFiltersButton').addEventListener('click', clearFilters);
  document.getElementById('findButton').addEventListener('click', applyFind);
  document.getElementById('clearFindButton').addEventListener('click', () => {
    document.getElementById('findInput').value = '';
    clearFindHighlighting();
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
  
    // Reapply find term and highlight
    applyFind();
  }
  

function filterLogs() {
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  const keyword = document.getElementById('searchInput').value;

  const filtered = fullLogData.filter(entry => {
    const timeOK = (!start || entry.time >= start) && (!end || entry.time <= end);
    const keywordOK = !keyword || entry.text.includes(keyword);
    return timeOK && keywordOK;
  });

  renderLog(filtered);
}

function clearFilters() {
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
  document.getElementById('searchInput').value = '';
  renderLog(fullLogData);
}

function applyFind() {
    const findTerm = document.getElementById('findInput').value.trim();
    currentMatches = [];
    currentMatchIndex = 0;
  
    if (!findTerm) {
      clearFindHighlighting();
      return;
    }
  
    const logContainer = document.getElementById('logContainer');
    const entries = logContainer.querySelectorAll('div');
  
    entries.forEach((div, index) => {
      const text = div.textContent;
  
      if (text.includes(findTerm)) {
        const regex = new RegExp(`(${findTerm})`, 'gi');
        div.innerHTML = div.textContent.replace(regex, `<mark>$1</mark>`);
        currentMatches.push(div);
      } else {
        div.innerHTML = div.textContent;
      }
    });
  
    updateFindCounter();
    focusCurrentMatch();
  }
  
  
  function focusCurrentMatch() {
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
  }
  
  
  
  
  
  
  function updateFindCounter() {
    const counter = document.getElementById('findCounter');
    if (currentMatches.length === 0) {
      counter.textContent = '';
    } else {
      counter.textContent = `${currentMatchIndex + 1} of ${currentMatches.length}`;
    }
  }
  
  function clearFindHighlighting() {
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
    if (currentMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
    focusCurrentMatch();
  }
  function prevFindMatch() {
    if (currentMatches.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + currentMatches.length) % currentMatches.length;
    focusCurrentMatch();
  }
  
    



  