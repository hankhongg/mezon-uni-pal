import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function runPythonScraper(url, tenTruong) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'crawler.py'); // Absolute path

    const py = spawn('python', [scriptPath, url, tenTruong]);

    let data = '';
    let error = '';

    py.stdout.on('data', (chunk) => {
      data += chunk;
    });

    py.stderr.on('data', (chunk) => {
      error += chunk;
    });

    py.on('close', (code) => {
      if (code !== 0 || error) {
        reject(error || `Exited with code ${code}`);
      } else {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject("Failed to parse JSON: " + e.message + "\nRaw data: " + data);
        }
      }
    });
  });
}
