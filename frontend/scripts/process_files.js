document.addEventListener('DOMContentLoaded', async () => {
    const logContainer = document.getElementById('logContainer');
    const noFileMessage = document.getElementById('logNoFileMessage');
  
    try {
      // Fetch the latest processed log on page load
      const response = await fetch('/api/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // can later add { logId: '...' }
      });
  
      if (!response.ok) throw new Error('Failed to fetch processed log');
  
      const processedLogs = await response.json();
  
      if (!Array.isArray(processedLogs) || processedLogs.length === 0) {
        throw new Error('No log entries available.');
      }
  
      // Clear and populate log container
      logContainer.innerHTML = '';
      processedLogs.forEach(entry => {
        const div = document.createElement('div');
        if (entry.class) div.classList.add(entry.class);
        div.textContent = `[ID: ${entry.id}] [${entry.time}] ${entry.text}`;
        logContainer.appendChild(div);
      });
  
      // Show the container, hide placeholder message
      logContainer.style.display = 'block';
      noFileMessage.style.display = 'none';
  
    } catch (err) {
      console.error('❌ Error displaying log:', err);
      noFileMessage.textContent = 'Failed to load processed log.';
      noFileMessage.style.display = 'block';
      logContainer.style.display = 'none';
    }
  });
  
  




  