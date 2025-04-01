export const filterState = {
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
      const rawDate = new Date(entry.time);
      const logDate = new Date(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), rawDate.getHours(), rawDate.getMinutes());
      const timeOK = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
      const keywordOK = !keyword || entry.text.includes(keyword);
      return timeOK && keywordOK;
    });
        
    //console.log(`🔍 Filtered result: ${filteredLogs.length} entries`);
    //console.log('📄 filteredLogs preview:', filteredLogs.slice(0, 5));
  
    renderLog(filteredLogs);
  }

  export function updateRecordCount() {
    console.log('🔎 updateRecordCount called');
    const countElement = document.getElementById('recordCountDisplay');
    countElement.textContent = `Total Records: ${filterState.displayedLogs.length}`;
  }
  

