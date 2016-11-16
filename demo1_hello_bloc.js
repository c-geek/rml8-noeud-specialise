#!/usr/bin/env node
"use strict";

const co      = require('co');
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

    const head = yield duniterServer.dal.blockDAL.getCurrent();
    if (head) {
      console.log('Bloc courant = #%s', head.number);
    } else {
      console.log('Pas de bloc courant, blockchain vide.');
    }
    process.exit(0);

    /****************************************/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}));
