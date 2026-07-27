const path = require('path');

module.exports = (spec, options) => {
  const result = options.defaultResolver(spec, {
    ...options,
    filePathFilter: (filePath) => {
      return filePath.includes('node_modules') === false ||
             filePath.includes('@nestjs') ||
             filePath.includes('typeorm') ||
             filePath.includes('passport');
    },
  });

  if (result.path && result.path.endsWith('.js') && !result.path.includes('node_modules')) {
    const tsPath = result.path.replace(/\.js$/, '.ts');
    const fs = require('fs');
    if (fs.existsSync(tsPath)) {
      result.path = tsPath;
    }
  }

  return result;
};
