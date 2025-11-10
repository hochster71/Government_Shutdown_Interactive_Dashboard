export function buildHelmetOptions(isProduction, allowedOrigins = []) {
  // Build Content Security Policy directives depending on environment
  const defaultScriptAndStyle = isProduction
    ? ["'self'"]
    : ["'self'", "'unsafe-inline'"]; // allow unsafe-inline in dev for tooling like Vite

  // connect-src should allow self and any configured allowed origins in production
  const connectSrc = ["'self'", 'https:'];
  if (Array.isArray(allowedOrigins) && allowedOrigins.length) {
    // Only allow origins (strip paths)
    allowedOrigins.forEach((o) => {
      if (typeof o === 'string' && o.trim()) {
        connectSrc.push(o.trim());
      }
    });
  }

  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: defaultScriptAndStyle,
        styleSrc: defaultScriptAndStyle,
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc,
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      }
    },
    crossOriginEmbedderPolicy: false
  };
}

export default buildHelmetOptions;
