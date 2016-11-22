#!/usr/bin/env node
"use strict";

const _       = require('underscore');
const co      = require('co');
const duniter = require('duniter');
const constants = require('duniter/app/lib/constants');
const Membership = require('duniter/app/lib/entity/membership');

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

    /**
     * Synopsis: nœud Duniter qui embarque un nœud satellite mémoire parcourant la blockchain pour y vérifier la bonne
     *   application de la règle de distance.
     */

    // Dictionnaire d'identités
    const dicoIdentites = yield donneDictionnaireIdentites(duniterServer);

    // Satellite mémoire
    const memServer = duniter({
      memory: true,
      name: 'tmp_' + Date.now() // Donne un nom de BDD unique
    }, {
      salt: 'abc',
      passwd: 'abc'
    });
    // Initialisation du satellite
    yield memServer.initWithDAL();

    // Parcours de la blockchain du nœud principal pour alimenter le satellite en données
    const blocks = yield duniterServer.dal.blockDAL.query('SELECT * FROM block WHERE number <= 57000');
    const buffer = [];
    for (const block of blocks) {

      const blocAvecAdhesions = block.joiners.length || block.actives.length;
      if (!blocAvecAdhesions) {

        // Les blocs sans adhésion sont ajoutés en masse pour aller plus vite
        buffer.push(block);

      } else {

        if (buffer.length) {
          // On commit les blocs du buffer avant tout
          yield memServer.BlockchainService.saveBlocksInMainBranch(buffer);
          // Vide le buffer
          buffer.splice(0, buffer.length);
        }

        // Contexte de données
        const head = yield memServer.dal.getBlock(block.number - 1);
        const membersCount = head ? head.membersCount : 0;
        let dSen;
        if (block.version <= 3) {
          dSen = Math.ceil(constants.CONTRACT.DSEN_P * Math.exp(Math.log(membersCount) / memServer.conf.stepMax));
        } else {
          dSen = Math.ceil(Math.pow(membersCount, 1 / memServer.conf.stepMax));
        }

        // Ajout du bloc
        yield memServer.BlockchainService.saveBlocksInMainBranch([block]);

        // Calcul des sentries **après** ajout du bloc
        const toutesLesSentries = memServer.dal.wotb.getSentries(dSen);

        // La règle de distance s'applique à tous ceux qui entrent ou renouvellent leur adhésion.
        // Vérifions que celle-ci est bien appliquée par extraction visuelle :

        console.log('============ Adhésions au bloc#%s ============', block.number);
        console.log('Les sentries = les membres ayant émis %s certifications en cours de validité', dSen);
        if (block.number == 0) {
          console.log('>>> Distance max fixée à %s', memServer.conf.stepMax);
        }
        if (toutesLesSentries.length) {

          const uidsTestes = block.joiners.concat(block.actives).map((inlineMS) => Membership.statics.fromInline(inlineMS).userid);

          for (const uid of uidsTestes) {
            let sentriesAtteintes = 0;
            let sentries = toutesLesSentries.slice();
            const identiteTestee = (yield memServer.dal.idtyDAL.query('SELECT * FROM idty WHERE member AND uid = ?', [uid]))[0];
            // On n'a pas besoin d'atteindre soi-même
            const positionDuTeste = sentries.indexOf(identiteTestee.wotb_id);
            if (positionDuTeste !== -1) {
              sentries.splice(positionDuTeste, 1);
            }
            const minSentriesAAtteindre = Math.floor(memServer.conf.xpercent * sentries.length);
            console.log("Passer la règle de distance pour %s => atteindre au moins %s/%s sentries", uid, minSentriesAAtteindre, sentries.length);
            let i = 1;
            for (const sentry of sentries) {
              const sentryUID = (yield memServer.dal.idtyDAL.query('SELECT * FROM idty WHERE member AND wotb_id = ?', [sentry]))[0].uid;
              const plusCourtsCheminsPossibles = memServer.dal.wotb.getPaths(sentry, identiteTestee.wotb_id, memServer.conf.stepMax);
              if (plusCourtsCheminsPossibles.length) {
                console.log('Test de distance sentry %s : %s', sentry, traduitCheminEnIdentites(plusCourtsCheminsPossibles, dicoIdentites));
              } else {
                console.log('Test de distance sentry %s : PAS DE CHEMIN %s <= %s', sentry, uid, sentryUID);
              }
              if (plusCourtsCheminsPossibles.length) {
                sentriesAtteintes++;
              }
              i++;
            }
            console.log('Test de distance pour %s (wotb_id = %s) = %s/%s = %s', uid, identiteTestee.wotb_id, sentriesAtteintes, minSentriesAAtteindre, sentriesAtteintes >= minSentriesAAtteindre ? 'OK' : 'KO');
          }

        } else {
          console.log("Pas de sentries (nécessite l'émission de %s certifications)", dSen);
        }
        console.log();
      }
    }

    const head = yield memServer.dal.blockDAL.getCurrent();
    console.log('>>> HEAD = #%s', head.number);

    process.exit(0);

    /****************************************/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}));

function donneDictionnaireIdentites(duniterServer) {
  return co(function*() {
    const dico = {};
    const identites = yield duniterServer.dal.idtyDAL.query('SELECT * FROM idty WHERE wotb_id IS NOT NULL');
    for (const identite of identites) {
      dico[identite.wotb_id] = identite;
    }
    return dico;
  });
}

function traduitCheminEnIdentites(chemins, dicoIdentites) {
  const cheminsTries = chemins.sort((cheminA, cheminB) => {
    if (cheminA.length < cheminB.length) {
      return -1;
    }
    if (cheminA.length > cheminB.length) {
      return 1;
    }
    return 0;
  });
  if (cheminsTries[0]) {
    const inverse = cheminsTries[0].slice().reverse();
    return inverse.map((wotb_id) => dicoIdentites[wotb_id].uid).join(' <= ');
  } else {
    return '-- Aucun --';
  }
}
