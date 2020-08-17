/**
 * Used in testing. See .mocharc.js.
 */

const hook = require('css-modules-require-hook');

hook({
  generateScopedName: '[name]__[local]___[hash:base64:5]',
});
