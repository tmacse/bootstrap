module.exports = {
  comments: false,
  shouldPrintComment: (comment) => /@license|@preserve|Copyright|Licensed under/.test(comment),
  presets: [
    [
      '@babel/env',
      {
        loose: true,
        modules: false,
        exclude: ['transform-typeof-symbol']
      }
    ]
  ],
  plugins: [
    process.env.PLUGINS && 'transform-es2015-modules-strip'
  ].filter(Boolean),
  env: {
    test: {
      plugins: [ 'istanbul' ]
    }
  }
};
