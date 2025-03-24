import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⬅️ one level up from /config, then into /Output
export const htmlOutputPath = path.join(__dirname, '..', 'Output', 'filtered_log_v3.html');



