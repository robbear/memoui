/*jslint node: true */
'use strict';

const fs = require('fs-extra');

function generateTimeStamp() {
  let date = new Date();
  let year = date.getFullYear().toString();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let hour = date.getHours();
  let minute = date.getMinutes();
  let second = date.getSeconds();

  let timeStamp = year.toString() +
    (month < 10 ? '0' : '') +
    month.toString() +
    (day < 10 ? '0' : '') +
    day.toString() +
    (hour < 10 ? '0' : '') +
    hour.toString() +
    (minute < 10 ? '0' : '') +
    minute.toString() +
    (second < 10 ? '0' : '') +
    second.toString();

  return timeStamp;
}

function buildVersion() {
  let sourceVersion = process.env.SOURCE_VERSION;
  if (!sourceVersion) {
    sourceVersion = 'undefined';
  }
  
  const timeStamp = generateTimeStamp();
  
  fs.writeFileSync('version.txt', sourceVersion + '\n');
  fs.writeFileSync('timestamp.txt', timeStamp + '\n');
}

buildVersion();