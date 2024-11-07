import fs from 'node:fs';
import path from 'node:path';
// src/electron/config.js
import { app } from 'electron';

class ConfigManager {
    private configPath: string;
    constructor() {
        // Get the user's home directory and create the config path
        const userHome = app.getPath('home');
        this.configPath = path.join(
            userHome,
            '.config',
            'open-chat',
            'settings.json',
        );

        // Ensure .config directory exists
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Create config file with defaults if it doesn't exist
        if (!fs.existsSync(this.configPath)) {
            this.writeConfig(this.getDefaultConfig());
        }
    }

    getDefaultConfig() {
        return {
            modelOptions: [
                {
                    backend: 'OpenAI',
                    models: [{ name: 'gpt-4o' }, { name: 'gpt-4o-mini' }],
                },
                {
                    backend: 'SGLang',
                    endpoints: [],
                },
            ],
        };
    }

    readConfig() {
        try {
            const data = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading config:', error);
            return this.getDefaultConfig();
        }
    }

    writeConfig(config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error('Error writing config:', error);
            return false;
        }
    }

    updateConfig(updates) {
        const currentConfig = this.readConfig();
        const newConfig = { ...currentConfig, ...updates };
        return this.writeConfig(newConfig);
    }
}

// Create and export a singleton instance
const configManager = new ConfigManager();
export default configManager;
