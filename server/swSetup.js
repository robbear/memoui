/*
 *  Utility for setting service worker version
 */

'use strict';

const fs = require('fs');
const promisify = require('util').promisify;
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);


function updateServiceWorkerVersion() {
  // Default values in case there's no timestamp.txt.
  // In the case of no timestamp.txt, assume we're in a dev build environment
  // where the dev wants to use the repository's static path, public/src
  const defaultTimestamp = 'src';
  let pathVal;
  let swPath;
  
  return readFileAsync('./timestamp.txt', 'utf-8')
  .then(timestampContents => {
    pathVal = timestampContents ?
      timestampContents.trim() :
      defaultTimestamp;
    swPath = `public/${pathVal}/service-worker.js`;
    return readFileAsync(swPath, 'utf-8');
  })
  .then(fileContents => {
    fileContents = fileContents
    .replace(
      'const SW_CACHE_VERSION = \'0\';',
      `const SW_CACHE_VERSION = \'${pathVal}\';`
    );

    return writeFileAsync(swPath, fileContents, 'utf-8');    
  })
  .catch(error => {
    console.error(`>>> Make sure to run 'node buildVersion.js for production builds'`);
  });
}

updateServiceWorkerVersion();