function errorHandler(err, req, res, next) {
  console.error(err.stack);
  
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500);
  res.render('error', {
    message: isDev ? err.message : 'Internal Server Error',
    error: isDev ? err : { status: err.status || 500 },
    layout: false,
    title: 'Error'
  });
}

function notFoundHandler(req, res, next) {
  res.status(404);
  res.render('error', {
    message: 'Page Not Found',
    error: { status: 404 },
    layout: false,
    title: '404'
  });
}

module.exports = { errorHandler, notFoundHandler };
