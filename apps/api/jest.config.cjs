module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
      },
    }],
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  // Le code source cible NodeNext (imports en `.js`) ; en test on résout vers les `.ts`.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
