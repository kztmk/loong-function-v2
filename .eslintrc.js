// functions/.eslintrc.js
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser', // TypeScriptを解析するパーサー
  parserOptions: {
    project: ['tsconfig.json'], // tsconfig.jsonのパスを指定して型情報を使ったLintを有効化
    sourceType: 'module',
    ecmaVersion: 2020, // tsconfig.jsonのtargetと合わせる
  },
  plugins: [
    '@typescript-eslint', // TypeScript固有のルール
    'import', // import/exportの構文チェック
    'prettier', // Prettierとの連携用
  ],
  extends: [
    'eslint:recommended', // ESLintの推奨ルール
    'plugin:@typescript-eslint/recommended', // TypeScript ESLintの推奨ルール
    // "plugin:@typescript-eslint/recommended-requiring-type-checking", // 型情報が必要なより厳格なルール (有効にするとLintが重くなる場合あり)
    'plugin:import/typescript', // eslint-plugin-import の TypeScript サポート
    'prettier', // Prettierと競合するESLintルールを無効化 (eslint-config-prettier)
    'plugin:prettier/recommended', // PrettierのルールをESLintのルールとして実行 (eslint-plugin-prettier)
  ],
  rules: {
    'prettier/prettier': 'error', // Prettierのルール違反をESLintエラーとして報告
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // 未使用変数を警告 (アンダースコアで始まる引数は無視)
    '@typescript-eslint/explicit-module-boundary-types': 'off', // exportされる関数の戻り値の型を必須にしない (お好みで "warn" や "error" に)
    '@typescript-eslint/no-explicit-any': 'warn', // any型の使用を警告 (より厳しくするなら "error")
    'import/order': [
      // import文の順序を強制
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-unresolved': 'off', // Firebase Functionsのモジュール解決で誤検知することがあるため無効化 (必要に応じて調整)
    'no-console': 'warn', // console.logの使用を警告 (本番ではエラーにするなど)
    // その他、プロジェクトに応じてルールを追加・変更
  },
  ignorePatterns: [
    '/lib/**/*', // トランスパイル後のJSファイルはLint対象外
    '/node_modules/**/*',
  ],
};
