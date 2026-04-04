const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
        // Many controllers were defaulting to throwing general Error objects
        // and expecting them to return 400 Bad Request. 
        // This ensures backwards compatibility with those tests/responses.
        if (!err.status) {
            err.status = 400;
        }
        next(err);
    });
};

module.exports = asyncHandler;
