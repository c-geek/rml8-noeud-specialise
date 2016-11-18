#!/usr/bin/env node
"use strict";

const co      = require('co');
const es      = require('event-stream');
const duniter = require('duniter');
const http    = require('http');
const express = require('express');
const RSS = require('rss');

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

	var feedOptions = {
	    title: 'DUniter feed',
	    feed_url: '/rss',
	    ttl: 1
	};
	var feed = new RSS(feedOptions);

	/**
	 * Sur appel de l'URL /abc
	 */
	app.get('/rss', (req, res) => co(function *() {
	    try {
		var xml = feed.xml({indent: true});
    res.type('application/xml');
		res.status(200).send(xml);
	    } catch (e) {
		// En cas d'exception, afficher le message
		res.status(500).send('<pre>' + (e.stack || e.message) + '</pre>');
	    }
	}));

	const httpServer = http.createServer(app);
	httpServer.listen(PORT, HOTE);
	console.log("Serveur web disponible a l'adresse http://%s:%s", HOTE, PORT);
	console.log("Page web 1 : http://%s:%s/bloc_courant", HOTE, PORT);

	duniterServer.pipe(es.mapSync((data) => {
	    if (data.documentType == 'peer') {
		console.log('>> Nouvelle fiche de pair !');
		feed.item({
		    title: "Nouvelle fiche de pair",
		    guid: (new Date()).toISOString(),
		    pubDate: (new Date()).toISOString(),
		    date: (new Date()).toISOString(),
		});
	    }
	    else if (data.documentType == 'block') {
		console.log('>> Nouveau bloc !');
		feed.item({
		    title: "Nouveau bloc",
		    guid: (new Date()).toISOString(),
		    pubDate: (new Date()).toISOString(),
		    date: (new Date()).toISOString(),
		});
	    }
	    else {
		console.log('>> Nouvelle donnée !');
		console.log(data);
		feed.item({
		    title: "Nouvelle donnée",
		    guid: (new Date()).toISOString(),
		    pubDate: (new Date()).toISOString(),
		    date: (new Date()).toISOString(),
		});
	    }
	}));

	/****************************************/

    } catch (e) {
	console.error(e);
	process.exit(1);
    }
}));
