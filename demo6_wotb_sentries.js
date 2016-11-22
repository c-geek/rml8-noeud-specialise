#!/usr/bin/env node
"use strict";

const co        = require('co');
const duniter   = require('duniter');
const constants = require('duniter/app/lib/constants');

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

    const head = yield duniterServer.dal.getCurrentBlockOrNull();
    const membersCount = head ? head.membersCount : 0;
    let dSen;
    if (head.version <= 3) {
      dSen = Math.ceil(constants.CONTRACT.DSEN_P * Math.exp(Math.log(membersCount) / duniterServer.conf.stepMax));
    } else {
      dSen = Math.ceil(Math.pow(membersCount, 1 / duniterServer.conf.stepMax));
    }

    const pointsDeControle = duniterServer.dal.wotb.getSentries(dSen);
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
