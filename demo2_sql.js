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

    console.log('Recherche des pairs connus en base de données...');
    const peers = yield duniterServer.dal.peerDAL.query('SELECT * FROM peer');
    if (peers.length == 0) {
      console.log('Aucun pair trouvé en base de données.');
    } else {
      for (const pair of peers) {
        console.log('Pair : %s, interface : %s', pair.pubkey, pair.endpoints[0]);
      }
    }
    process.exit(0);

    /****************************************/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}));
