/*jslint node: true */
'use strict';

const version = require('./version.js');
const exec = require('child_process').exec;

function copyStatic() {
  version.getVersionInfo()
  .then(versionInfo => {
    exec('rm -rf public/2*', () => {
      if (!versionInfo.build || versionInfo.build === 'src') {
        return;
      }
      
      exec(`cp -r public/src public/${versionInfo.build}`, () => {
        console.log(`Static files copied to public/${versionInfo.build}`);
      });
    });
  });
}

copyStatic();
