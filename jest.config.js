module.exports = {
  testEnvironment: 'node',
  notify: true,
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  roots: ['<rootDir>/test/', '<rootDir>/server/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['test/**/*.{js,ts}', '!**/node_modules/**', '!**/dist/**', '!**/vendor/**'],
  coverageReporters: ['json', 'lcov'],
  coverageDirectory: 'coverage',
  verbose: true,
  watchPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
};
