import buildHelmetOptions from '../security/helmetOptions.js';

describe('Helmet options builder', () => {
  test('production options do not include unsafe-inline for script/style', () => {
    const opts = buildHelmetOptions(true, ['https://example.com']);
    expect(opts).toHaveProperty('contentSecurityPolicy');
    const directives = opts.contentSecurityPolicy.directives;
    expect(directives.scriptSrc).not.toContain("'unsafe-inline'");
    expect(directives.styleSrc).not.toContain("'unsafe-inline'");
    expect(directives.defaultSrc).toEqual(["'self'"]);
  });

  test('development options include unsafe-inline for script/style', () => {
    const opts = buildHelmetOptions(false, []);
    const directives = opts.contentSecurityPolicy.directives;
    expect(directives.scriptSrc).toContain("'unsafe-inline'");
    expect(directives.styleSrc).toContain("'unsafe-inline'");
  });

  test('connectSrc includes allowed origins', () => {
    const opts = buildHelmetOptions(true, ['https://api.example.com', 'https://cdn.example.com']);
    const directives = opts.contentSecurityPolicy.directives;
    // Should include self and the allowed origins (no wildcard https: for security)
    expect(directives.connectSrc).toEqual(expect.arrayContaining(["'self'", 'https://api.example.com', 'https://cdn.example.com']));
  });
});
