const debug1On = false;
const debug2On = false;

export function handleDiagnosticLogTypes(text) {
    switch (true) {
        case text.includes("Setting LogLevel"):
            return null;
        default:
            return text; // Unhandled log type
    }
}