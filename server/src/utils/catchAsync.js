// server/src/utils/catchAsync.js

/**
 * Wraps an async express controller/middleware function to automatically 
 * catch errors and pass them to next().
 */
module.exports = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};