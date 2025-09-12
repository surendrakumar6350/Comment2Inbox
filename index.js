import minimist from 'minimist';
import { InstagramBot } from './bin/InstagramBot.js';
import { EnvCache } from './bin/EnvCache.js';

const args = minimist(process.argv.slice(2));
const bot = new InstagramBot();

let runUrl;

if (args.useCachedEnv) {
    const cachedEnv = EnvCache.load();
    if (cachedEnv) {
        process.env.INSTAGRAM_USERNAME = cachedEnv.INSTAGRAM_USERNAME;
        process.env.INSTAGRAM_PASSWORD = cachedEnv.INSTAGRAM_PASSWORD;
        process.env.INSTAGRAM_COOKIE = cachedEnv.INSTAGRAM_COOKIE;
        runUrl = args.url || cachedEnv.URL;
        if (!runUrl) throw new Error('No URL provided and no cached URL found.');
        console.log('Loaded cached environment variables and URL.');
    } else {
        throw new Error('No cached environment variables found.');
    }
} else {
    if (!args.username || !args.password || !args.url) {
        throw new Error('Please provide Instagram username, password, and post URL as arguments.');
    }
    process.env.INSTAGRAM_USERNAME = args.username;
    process.env.INSTAGRAM_PASSWORD = args.password;
    runUrl = args.url;
}

(async () => {
    // If not using cached env, get new cookies and cache env + url
    if (!args.useCachedEnv) {
        const cookies = await bot.getInstagramCookies();
        process.env.INSTAGRAM_COOKIE = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        // Cache the new env values and url
        EnvCache.save({
            INSTAGRAM_USERNAME: process.env.INSTAGRAM_USERNAME,
            INSTAGRAM_PASSWORD: process.env.INSTAGRAM_PASSWORD,
            INSTAGRAM_COOKIE: process.env.INSTAGRAM_COOKIE,
            URL: runUrl
        });
        console.info('Arguments cached. To use the cached arguments next time, run: node index.js --useCachedEnv');
    }
    await bot.monitorComments(runUrl, 10000);
})();


