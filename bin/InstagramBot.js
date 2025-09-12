import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { IgApiClient } from 'instagram-private-api';
import puppeteer from 'puppeteer';
import { CommentStorage } from './CommentStorage.js';

const path = './bin/comments.json';

export class InstagramBot {

    /**
     * Initializes a new instance of InstagramBot.
     */
    constructor() {
        this.ig = new IgApiClient();
        this.isLoggedIn = false;
        this.commentStorage = new CommentStorage(path);
    }

    /**
     * Logs in to Instagram using credentials from environment variables.
     * Required for sending direct messages.
     * @throws {Error} If credentials are missing or login fails.
     */
    async login() {
        if (this.isLoggedIn) return; // Already logged in

        if (!process.env.INSTAGRAM_USERNAME || !process.env.INSTAGRAM_PASSWORD) {
            throw new Error('Instagram credentials are not set in environment variables.');
        }

        this.ig.state.generateDevice(process.env.INSTAGRAM_USERNAME);
        try {
            await this.ig.account.login(
                process.env.INSTAGRAM_USERNAME,
                process.env.INSTAGRAM_PASSWORD
            );
            this.isLoggedIn = true;
            console.log('Logged in successfully. [For DM functionality]');
        } catch (err) {
            console.error('Login failed:', err);
            throw err;
        }
    }

    /**
     * Sends a direct message to a user.
     * @param {string} username - Instagram username to send the message to.
     * @param {string} message - Message content.
     */
    async sendDM(username, message) {
        await this.login(); // ensure logged in

        try {
            const userId = await this.ig.user.getIdByUsername(username);
            await this.ig.entity.directThread([userId.toString()]).broadcastText(message);
            console.log(`Message sent to ${username}`);
        } catch (err) {
            console.error('Error sending DM:', err);
        }
    }


    /**
     * Fetches a single page of comments from Instagram GraphQL API.
     * @param {string} shortcode - Instagram post shortcode.
     * @param {string} endCursor - Cursor for pagination.
     * @param {string} cookie - Instagram session cookie.
     * @returns {Promise<Object>} The API response data.
     */
    async fetchCommentsPage(shortcode, endCursor, cookie) {
        const queryHash = '33ba35852cb50da46f5b5e889df7d159';
        const variables = {
            shortcode: shortcode,
            after: endCursor,
            first: 50
        };
        const url = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
        const response = await axios.get(url, {
            headers: {
                'accept': '*/*',
                'cookie': cookie,
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        });
        return response.data;
    }

    /**
     * Extracts comments from the Instagram GraphQL API response data.
     * @param {Object} data - The API response data.
     * @returns {Array} Array of comment objects.
     */
    extractComments(data) {
        const media = data.data.shortcode_media;
        const edges = media.edge_media_to_comment.edges;
        return edges.map(edge => {
            const node = edge.node;
            return {
                comment_id: node.id,
                text: node.text,
                created_at: new Date(node.created_at * 1000).toISOString(),
                user_id: node.owner.id,
                username: node.owner.username,
                profile_pic_url: node.owner.profile_pic_url
            };
        });
    }

    /**
     * Extracts pagination info from the Instagram GraphQL API response data.
     * @param {Object} data - The API response data.
     * @returns {Object} Pagination info with hasNextPage and endCursor.
     */
    getPageInfo(data) {
        const media = data.data.shortcode_media;
        return {
            hasNextPage: media.edge_media_to_comment.page_info.has_next_page,
            endCursor: media.edge_media_to_comment.page_info.end_cursor
        };
    }

    /**
     * Fetches comments from an Instagram post using the public GraphQL API.
     * Automatically refreshes cookies if needed.
     * @param {string} postUrl - URL of the Instagram post.
     * @param {number} [maxComments=100] - Maximum number of comments to fetch.
     * @param {number} [retryCount=0] - Current retry count for cookie refresh.
     * @returns {Promise<Array>} Array of comment objects.
     * @throws {Error} If the post URL is invalid or fetching fails.
     */
    async getInstagramComments(postUrl, maxComments = 100, retryCount = 0) {
        const regex = /^https:\/\/(www\.)?instagram\.com\/p\/([a-zA-Z0-9_-]+)\/?$/;
        const match = postUrl.match(regex);
        const MAX_RETRIES = 3;

        if (!match) {
            throw new Error('Invalid Instagram post URL');
        }
        if (process.env.INSTAGRAM_COOKIE === undefined) {
            throw new Error('Instagram cookie is not set in environment variables.');
        }

        const shortcode = match[2];
        let comments = [];
        let hasNextPage = true;
        let endCursor = '';

        while (hasNextPage && comments.length < maxComments) {
            try {
                const data = await this.fetchCommentsPage(shortcode, endCursor, process.env.INSTAGRAM_COOKIE);
                const newComments = this.extractComments(data);
                comments.push(...newComments);
                ({ hasNextPage, endCursor } = this.getPageInfo(data));
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                if (retryCount >= MAX_RETRIES) {
                    throw new Error(`Failed after ${MAX_RETRIES} retries: ${err.message}`);
                }
                // refresh cookies
                const cookies = await this.getInstagramCookies();
                process.env.INSTAGRAM_COOKIE = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                return await this.getInstagramComments(postUrl, maxComments, retryCount + 1);
            }
        }
        return comments;
    }

    /**
     * Monitors comments on a given Instagram post and sends DMs to new commenters.
     * Polls for new comments at a specified interval.
     * @param {string} postUrl - URL of the Instagram post to monitor.
     * @param {number} [pollInterval=60000] - Polling interval in milliseconds.
     */
    async monitorComments(postUrl, pollInterval = 60000) {
        let storedComments = this.commentStorage.load();

        while (true) {
            try {
                const latestComments = await this.getInstagramComments(postUrl, 100);
                const newComments = this.commentStorage.getNewComments(latestComments, storedComments);

                if (newComments.length > 0) {
                    console.log(`New comments detected (${newComments.length}):`);
                    for (const c of newComments) {
                        console.log(`- ${c.username}: ${c.text}`);
                        await this.sendDM(c.username, `Hi ${c.username}, thanks for your comment: "${c.text}"`);
                    }
                    // Update stored comments
                    storedComments = [...storedComments, ...newComments];
                    this.commentStorage.save(storedComments);
                } else {
                    console.log('No new comments.');
                }
            } catch (err) {
                console.error('Error fetching comments:', err.message);
            }

            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }

    /**
    * Retrieves fresh Instagram cookies using Puppeteer by logging in.
    * @returns {Promise<Array>} Array of cookie objects.
    * @throws {Error} If credentials are missing or login fails.
    */
    async getInstagramCookies() {
        if (process.env.INSTAGRAM_USERNAME === undefined || process.env.INSTAGRAM_PASSWORD === undefined) {
            throw new Error('Instagram credentials are not set in environment variables.');
        }
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

        // Log in process
        await page.type('input[name=username]', process.env.INSTAGRAM_USERNAME);
        await page.type('input[name=password]', process.env.INSTAGRAM_PASSWORD);
        await Promise.all([
            page.click('button[type=submit]'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
        ]);

        // Get cookies
        const cookies = await page.cookies();

        await browser.close();
        return cookies;
    }
}