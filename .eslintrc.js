module.exports = {
  extends: 'erb',
  plugins: ['@typescript-eslint'],
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-filename-extension': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-import-module-exports': 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src/'],
      },
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.ts'),
      },
      typescript: {},
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  overrides: [
    {
      files: ['src/main/**/*.{js,jsx,ts,tsx}'],
      env: {
        node: true,
      },
      rules: {
        'no-use-before-define': 'off',
        'no-restricted-syntax': 'off',
        'no-plusplus': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-console': 'off',
        'global-require': 'off',
        'no-continue': 'off',
        radix: 'off',
        'class-methods-use-this': 'off',
        'no-await-in-loop': 'off',
        'no-undef': 'off',
        'promise/always-return': 'off',
        'no-unreachable': 'off',
        'no-promise-executor-return': 'off',
        'no-param-reassign': 'off',
        'no-new': 'off',
        'import/prefer-default-export': 'off',
        'default-case': 'off',
        camelcase: 'off',
        'import/no-named-as-default-member': 'off',
      },
    },
  ],
};
