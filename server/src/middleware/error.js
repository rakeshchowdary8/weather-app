export function notFound(req, res) { res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }); }
export function errorHandler(err, req, res, next) { console.error(err); res.status(err.status || 500).json({ message: err.message || 'Unexpected server error' }); }
