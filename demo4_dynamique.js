#!/usr/bin/env node
"use strict";

const co      = require('co');
const duniter = require('duniter');
const http    = require('http');
const express = require('express');

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

    const app = express();
    const HOTE = 'localhost';
    const PORT = 10500;

    /**
     * Sur appel de l'URL /abc
     */
    app.get('/bloc_courant', (req, res) => co(function *() {
      try {
        // Allons chercher le bloc courant
        const bloc = yield duniterServer.dal.blockDAL.getCurrent();
        // Générons un contenu de page à afficher
        const contenu = 'Hash du bloc courant : ' + bloc.hash;
        // Envoyons la réponse
        res.status(200).send('<pre>' + (contenu) + '</pre>');
      } catch (e) {
        // En cas d'exception, afficher le message
        res.status(500).send('<pre>' + (e.stack || e.message) + '</pre>');
      }
    }));

    const httpServer = http.createServer(app);
    httpServer.listen(PORT, HOTE);
    console.log("Serveur web disponible a l'adresse http://%s:%s", HOTE, PORT);
    console.log("Page web 1 : http://%s:%s/bloc_courant", HOTE, PORT);

    /****************************************/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}));
