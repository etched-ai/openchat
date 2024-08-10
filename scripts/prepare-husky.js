import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');

async function prepareHusky() {
    const envPath = join(rootDir, '.env');

    if (fs.existsSync(envPath)) {
        const { config } = await import('dotenv');
        const env = config({ path: envPath });
        if (env.parsed?.SKIP_HUSKY === 'true') {
            console.log(
                'Skipping Husky installation as per .env configuration.',
            );
            return;
        }
    }

    const { install } = await import('husky');
    await install();
    console.log('Husky installed successfully.');
}

prepareHusky().catch(console.error);
