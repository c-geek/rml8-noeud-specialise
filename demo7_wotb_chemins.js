#!/usr/bin/env node
"use strict";

const _       = require('underscore');
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

    const uidA = 'moul2';
    const uidB = 'inso';

    // Décommenter la ligne ci-dessous pour forcer le nombre de sauts à une valeur différente
    // duniterServer.conf.stepMax = 3;

    // Prend 2 identités
    const identiteA = (yield duniterServer.dal.idtyDAL.query('SELECT * FROM idty WHERE uid = ?', [uidA]))[0];
    const identiteB = (yield duniterServer.dal.idtyDAL.query('SELECT * FROM idty WHERE uid = ?', [uidB]))[0];
    const plusCourtsCheminsPossibles = duniterServer.dal.wotb.getPaths(identiteA.wotb_id, identiteB.wotb_id, duniterServer.conf.stepMax, duniterServer.conf.stepMax);

    // Va cherche les identités présentes dans les chemins
    const dictionnaireIdentites = yield vaChercherLesIdentitesEfficacement(plusCourtsCheminsPossibles, duniterServer);

    // Tri les chemins par identités successives
    const cheminsTries = fonctionDeTri(plusCourtsCheminsPossibles);

    // Récupère les identités complètes
    if (cheminsTries.length == 0) {
      if (uidA == uidB) {
        console.log("Il n'existe aucun chemin d'une identité vers elle-même. A méditer.")
      } else {
        console.log("Aucun chemin possible de %s vers %s en moins de %s saut(s).", uidA, uidB, duniterServer.conf.stepMax);
      }
    } else {
      console.log('%s est reconnu par %s à travers ces chemins :', uidB, uidA);
      for (const chemin of cheminsTries) {
        const membresSuccessifs = chemin.map((wotb_id) => dictionnaireIdentites[wotb_id].uid);
        console.log(membresSuccessifs.join(' -> '));
      }
    }

    process.exit(0);

    /****************************************/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}));

function vaChercherLesIdentitesEfficacement(plusCourtsCheminsPossibles, duniterServer) {
  return co(function*() {
    // Va récupérer les identités des chemins, sans aller chercher 2 fois la même
    const tousLesIdentifiantsDesCheminsPossibles = plusCourtsCheminsPossibles.reduce((cumul, chemin) => {
      // Rassemble tous les tableaux en un seul
      return cumul.concat(chemin);
    }, []);
    const identifiantsUniques = _.uniq(tousLesIdentifiantsDesCheminsPossibles);
    const dictionnaireParWotID = {};
    yield identifiantsUniques.map((sentryWotID) => co(function*() {
      // Va chercher en base de données l'identité par son identifiant wotb
      dictionnaireParWotID[sentryWotID] = (yield duniterServer.dal.idtyDAL.query('SELECT * FROM idty WHERE wotb_id = ?', [sentryWotID]))[0];
    }));
    return dictionnaireParWotID;
  });
}

function fonctionDeTri(plusCourtsCheminsPossibles) {
  plusCourtsCheminsPossibles.sort((cheminA, cheminB) => {
    if (cheminA.length < cheminB.length) {
      return -1;
    } else if (cheminB.length < cheminA.length) {
      return 1;
    } else {
      // Les tableaux ont la même longueur
      for (let i = 0; i < cheminA.length; i++) {
        if (cheminA[i] < cheminB[i]) {
          return -1;
        } else if (cheminA[i] > cheminB[i]) {
          return 1;
        }
      }
      // Les tableaux sont peut-être identiques.
      return 0;
    }
  });
  return plusCourtsCheminsPossibles;
}
