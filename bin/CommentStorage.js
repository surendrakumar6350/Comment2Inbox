import fs from 'fs';

/**
 * Handles loading and saving Instagram comments to a file.
 */
export class CommentStorage {
    /**
     * @param {string} filePath - Path to the comments JSON file.
     */
    constructor(filePath) {
        this.filePath = filePath;
    }

    /**
     * Loads comments from the file.
     * @returns {Array} Array of comment objects.
     */
    load() {
        if (fs.existsSync(this.filePath)) {
            const data = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    }

    /**
     * Saves comments to the file.
     * @param {Array} comments - Array of comment objects to save.
     */
    save(comments) {
        fs.writeFileSync(this.filePath, JSON.stringify(comments, null, 2), 'utf-8');
    }

    /**
     * Gets new comments that are not in the stored comments.
     * @param {Array} latestComments - Array of latest comment objects.
     * @param {Array} storedComments - Array of previously stored comment objects.
     * @returns {Array} Array of new comment objects.
     */
    getNewComments(latestComments, storedComments) {
        const storedCommentIds = new Set(storedComments.map(c => c.comment_id));
        return latestComments.filter(c => !storedCommentIds.has(c.comment_id));
    }
}