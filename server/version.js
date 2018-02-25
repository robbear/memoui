/*
 *  Utilities for building out the version page
 */

'use strict';

const fs = require('fs');
const promisify = require('util').promisify;
const readFileAsync = promisify(fs.readFile);

module.exports = {

  getVersionInfo() {
    // Default values in case there's no version.txt or timestamp.txt.
    // In the case of no timestamp.txt, assume we're in a dev build environment
    // where the dev wants to use the repository's static path, public/src
    const defaultTimestamp = 'src';
    const defaultVersion = 'undefined';
    
    let result = {};
    return readFileAsync('./timestamp.txt', 'utf-8')
    .then(timestampContents => {
      result.build = timestampContents ?
        timestampContents.trim() :
        defaultTimestamp;
      return readFileAsync('./version.txt', 'utf-8');
    })
    .then(versionContents => {
      result.version = versionContents ?
        versionContents.trim() :
        defaultVersion;
      return result;
    })
    .catch(error => {
      console.log(`>>> Make sure to run 'node buildVersion.js for production builds'`);
      return {
        build: defaultTimestamp,
        version: defaultVersion
      };
    });
  }

};
