module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended', // TypeScript ESLintの推奨ルール
    'plugin:prettier/recommended', // Prettierの推奨ルールを適用し、競合するESLintルールを無効化
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'tsconfig.dev.json'], // tsconfig.dev.json を追加
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    '/lib/**/*', // Ignore built files.
    '/generated/**/*', // Ignore generated files.
  ],
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  rules: {
    // Prettierと競合する可能性のあるルールは削除または調整
    'prettier/prettier': 'error', // Prettierのルール違反をESLintエラーとして報告
    'import/no-unresolved': 0, // プロジェクトに応じて調整
    quotes: 'off', // Prettierにクォートスタイルを完全に任せる
    // 'indent': 'off', // Prettierがインデントを処理するため不要
    // 'quotes': 'off', // Prettierがクォートを処理するため不要
  }, // Prettierにフォーマットを任せるため、個別のスタイルルールは基本的に不要になります
};
