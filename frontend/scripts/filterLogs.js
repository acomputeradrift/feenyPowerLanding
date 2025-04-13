export const filterState = {
    displayedLogs: [],
    processedLogs: [],
  };

  function parseSearchInput(input) {
    const terms = [];
    const regex = /(-|\+)?(?:"([^"]+)"|(\S+))/g;
    let match;
  
    while ((match = regex.exec(input)) !== null) {
      const operator = match[1] || ''; // +, -, or ''
      const quoted = match[2];         // if quoted
      const plain = match[3];          // if not quoted
      const value = (quoted || plain || '').toLowerCase();
  
      if (value) {
        terms.push({ operator, value });
      }
    }
  
    return terms;
  }
  

  export function runFilterLogs(renderLog) {
    console.log('filterLogs called');
  
    const startInput = document.getElementById('startTime').value;
    const endInput = document.getElementById('endTime').value;
    const keyword = document.getElementById('searchInput').value.trim();
  
    const startDate = startInput ? new Date(startInput) : null;
    const endDate = endInput ? new Date(endInput) : null;
  
    const terms = parseSearchInput(keyword); // 🔹 new logic
  
    const filteredLogs = filterState.processedLogs.filter(entry => {
      const rawDate = new Date(entry.time);
      const logDate = new Date(
        rawDate.getFullYear(),
        rawDate.getMonth(),
        rawDate.getDate(),
        rawDate.getHours(),
        rawDate.getMinutes()
      );
  
      const timeOK = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
  
      const keywordOK = terms.every(term => {
        const text = entry.text.toLowerCase();
        if (term.operator === '-') {
          return !text.includes(term.value);
        }
        // '+' or no prefix
        return text.includes(term.value);
      });
  
      return timeOK && keywordOK;
    });
  
    renderLog(filteredLogs);
  }
  
  // export function runFilterLogs(renderLog) {
  //   console.log('filterLogs called');
  
  //   const startInput = document.getElementById('startTime').value;
  //   const endInput = document.getElementById('endTime').value;
  //   const keyword = document.getElementById('searchInput').value.trim();
  
  //   const startDate = startInput ? new Date(startInput) : null;
  //   const endDate = endInput ? new Date(endInput) : null;
  
  //   const filteredLogs = filterState.processedLogs.filter(entry => {
  //     const rawDate = new Date(entry.time);
  //     const logDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), rawDate.getHours(), rawDate.getMinutes());
  //     const timeOK = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
  //     const keywordOK = !keyword || entry.text.includes(keyword);
  //     return timeOK && keywordOK;
  //   });
        
  //   //console.log(`🔍 Filtered result: ${filteredLogs.length} entries`);
  //   //console.log('📄 filteredLogs preview:', filteredLogs.slice(0, 5));
  
  //   renderLog(filteredLogs);
  // }

  export function updateRecordCount() {
    console.log('🔎 updateRecordCount called');
    const countElement = document.getElementById('recordCountDisplay');
    countElement.textContent = `Total Records: ${filterState.displayedLogs.length}`;
  }
  

