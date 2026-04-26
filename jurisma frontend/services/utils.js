/**
 * Utility functions for Jurisma Social Hub
 */

/**
 * Transforms a flat array of comments into a nested tree structure.
 * Each comment should have an 'id' and 'parent_comment_id'.
 * 
 * @param {Array} comments - Flat array of comments
 * @returns {Array} Nested tree of comments
 */
export const buildCommentTree = (comments = []) => {
    if (!Array.isArray(comments)) return [];

    const map = {};
    const tree = [];

    // First pass: create a map of all comments
    comments.forEach(comment => {
        map[comment.id] = { ...comment, replies: [] };
    });

    // Second pass: build the tree
    comments.forEach(comment => {
        if (comment.parent_comment_id && map[comment.parent_comment_id]) {
            map[comment.parent_comment_id].replies.push(map[comment.id]);
        } else {
            tree.push(map[comment.id]);
        }
    });

    return tree;
};
