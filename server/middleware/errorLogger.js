// server/middleware/errorLogger.js

module.exports = function errorLogger(err, req, res, next) {
    console.error(err.stack); // Log the stack trace of the error

    next(err); // Pass the error to the next middleware function
};