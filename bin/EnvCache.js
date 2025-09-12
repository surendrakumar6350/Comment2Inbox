import fs from 'fs';

const ENV_CACHE_PATH = './bin/env_cache.json';

export class EnvCache {
    /**
     * Saves environment variable values to a cache file.
     * @param {Object} envObj - Object with env variable key-value pairs.
     */
    static save(envObj) {
        fs.writeFileSync(ENV_CACHE_PATH, JSON.stringify(envObj, null, 2), 'utf-8');
    }

    /**
     * Loads environment variable values from the cache file.
     * @returns {Object|null} The cached env object, or null if not found.
     */
    static load() {
        if (fs.existsSync(ENV_CACHE_PATH)) {
            const data = fs.readFileSync(ENV_CACHE_PATH, 'utf-8');
            return JSON.parse(data);
        }
        return null;
    }
}
