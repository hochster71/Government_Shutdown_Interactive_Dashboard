export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'adapters/**/*.js',
    'server.js',
    '!**/__tests__/**'
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  verbose: true
};
