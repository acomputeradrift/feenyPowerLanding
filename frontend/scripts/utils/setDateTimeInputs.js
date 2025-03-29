// Helper function to format date for datetime-local input
function formatForInput(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Function to calculate log range from processedLogs array
function calculateLogRange(logArray) {
  if (logArray.length === 0) return null;

  const firstTime = new Date(logArray[0].time);
  const lastTime = new Date(logArray[logArray.length - 1].time);

  return {
    minVal: formatForInput(firstTime),
    maxVal: formatForInput(lastTime),
  };
}

// Function to explicitly set datetime inputs using calculated log range
export function setDateTimeInputsToLogRange(logArray) {
  const range = calculateLogRange(logArray);
  if (!range) return;

  const startInput = document.getElementById('startTime');
  const endInput = document.getElementById('endTime');

  startInput.min = range.minVal;
  startInput.max = range.maxVal;
  startInput.value = range.minVal;

  endInput.min = range.minVal;
  endInput.max = range.maxVal;
  endInput.value = range.maxVal;

  console.log(`📆 Picker range set from ${range.minVal} to ${range.maxVal}`);
}

  