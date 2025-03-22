export function formatTimestampsForDisplay(uploadTimeServer, userTimeZone) {
    const formatOptions = {
      timeZoneName: 'short',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    };
  
    return {
      serverTime: uploadTimeServer.toLocaleString('en-US', {
        ...formatOptions,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // server timezone
      }),
      userTime: uploadTimeServer.toLocaleString('en-US', {
        ...formatOptions,
        timeZone: userTimeZone || 'UTC', // fallback if missing
      }),
    };
  }
  
  