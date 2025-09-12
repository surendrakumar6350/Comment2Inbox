# Instagram Comment Bot

## Overview

This project is an automated Instagram bot that monitors comments on a specified Instagram post and sends direct messages (DMs) to new commenters. 

### Features
- Monitors comments on an Instagram post in real-time
- Sends personalized DMs to new commenters

## Prerequisites
- Node.js (v16 or higher recommended)
- Instagram account credentials

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/surendrakumar6350/Comment2Inbox.git
   cd Comment2Inbox
   ```
2. Install dependencies:
   ```sh
   npm install
   ```

## Usage

### First Run (with credentials and post URL)
```sh
node index.js --username=your_username --password=your_password --url=https://instagram.com/p/POST_ID
```
- This will log in, fetch cookies, cache your credentials and URL, and start monitoring comments.

### Subsequent Runs (using cached credentials and URL)
```sh
node index.js --useCachedEnv
```
- This will use the cached credentials and URL from the previous run.

### Override Cached URL
```sh
node index.js --useCachedEnv --url=https://instagram.com/p/NEW_POST_ID
```
- This will use cached credentials but monitor a new post.


## Notes
- Make sure your Instagram account is allowed to send DMs and is not restricted.
- Instagram may rate-limit or block bots; use responsibly.
- All sensitive data is cached locally in `bin/env_cache.json`.
