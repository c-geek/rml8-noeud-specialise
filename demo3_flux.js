#!/usr/bin/env node
"use strict";

const co      = require('co');
const es      = require('event-stream');
const duniter = require('duniter');

const HOME_DUNITER_DATA_FOLDER = 'rml8';

// Use netobs data folder
if (!process.argv.includes('--mdb')) {
  process.argv.push('--mdb');
  process.argv.push(HOME_DUNITER_DATA_FOLDER);
}

// Default action = start
if (process.argv.length === 4) process.argv.push('start');

// Disable Duniter logs
duniter.statics.logger.mute();

duniter.statics.cli((duniterServer) => co(function*() {

  try {

    /****************************************
     * SPECIALISATION
     ***************************************/

    duniterServer.pipe(es.mapSync((data) => {
      if (data.documentType == 'peer') {
        console.log('>> Nouvelle fiche de pair !');
      }
      else if (data.documentType == 'block') {
        console.log('>> Nouveau bloc !');
      }
      else {
        console.log('>> Nouvelle donnée !');
        console.log(data);
      }
    }));

    /****************************************/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}));
