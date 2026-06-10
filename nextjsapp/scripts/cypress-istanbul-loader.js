// Webpack loader — must use CommonJS require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createInstrumenter } = require('istanbul-lib-instrument');

module.exports = function (source, inputSourceMap) {
  const callback = this.async();
  const instrumenter = createInstrumenter({
    esModules: true,
    produceSourceMap: true,
  });

  instrumenter.instrument(source, this.resourcePath, (error, code) => {
    if (error) {
      callback(error);
      return;
    }

    const sourceMap = instrumenter.lastSourceMap();
    callback(null, code, sourceMap);
  }, inputSourceMap);
};
