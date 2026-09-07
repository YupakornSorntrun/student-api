function deprecationMiddleware(req, res, next) {
  const deprecationDate = 1767225600;

  res.setHeader(
    "Deprecation",
    `@${deprecationDate}`
  );

  res.setHeader(
    "Link",
    '</api/v2/students>; rel="successor-version"'
  );

  next();
}

module.exports = deprecationMiddleware;