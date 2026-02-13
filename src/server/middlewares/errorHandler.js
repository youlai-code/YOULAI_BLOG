function errorHandler(err, req, res, next) {
    console.error('[Error]', err);

    if (res.headersSent) {
        return next(err);
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || 'INTERNAL_ERROR';

    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: 'NOT_FOUND'
    });
}

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

class AppError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.status = status;
        this.name = 'AppError';
    }
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    AppError
};
