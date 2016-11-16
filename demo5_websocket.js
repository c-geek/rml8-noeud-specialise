#!/usr/bin/env node
"use strict";

const co      = require('co');
const es      = require('event-stream');
const duniter = require('duniter');
const http    = require('http');
const path    = require('path');
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
    const WebSocketServer = require('ws').Server;

    const staticContentPath = path.join(__dirname, './exemple_websocket');
    app.use(express.static(staticContentPath));

    const httpServer = http.createServer(app);
    httpServer.listen(PORT, HOTE);
    console.log("Serveur web disponible a l'adresse http://%s:%s", HOTE, PORT);

    /****
     * Partie Websocket
     */

    let wssBlock = new WebSocketServer({
      server: httpServer,
      path: '/ws/data'
    });

    wssBlock.on('connection', function connection(ws) {

      console.log('Nouveau navigateur connecté');

      ws.on('close', () => {
        console.log('Fermeture du navigateur');
      })
    });

    wssBlock.broadcast = (data) => wssBlock.clients.forEach((client) => client.send(data));


    duniterServer.pipe(es.mapSync((data) => {
      try {
        wssBlock.broadcast(JSON.stringify(data, null, ' '));
      } catch (e) {
        console.error(e);
      }
    }));

    /****************************************/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}));
