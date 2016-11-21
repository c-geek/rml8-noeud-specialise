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

    // Trouve les points de contrôle efficacement grâce au module C (nommé "wotb")
    const pointsDeControle = duniterServer.dal.wotb.getSentries(duniterServer.conf.stepMax);
    // Récupère les identités complètes
    const identitesDeControle = yield pointsDeControle.map((sentryWotID) => {
      // Va chercher en base de données l'identité par son identifiant wotb
      return duniterServer.dal.idtyDAL.query('SELECT * FROM idty WHERE wotb_id = ?', [sentryWotID]);
    });
    // Affichage
    for (const identite of identitesDeControle) {
      console.log('Point de contrôle : %s', identite[0].uid);
    }
    process.exit(0);

    /****************************************/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}));
