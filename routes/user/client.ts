import express = require('express');
import path = require('path');
import {app, logging, config, passport, client} from '../../app';
import PubSub = require('pubsub-js');
import {CLIENT_USER_ROUTE} from '../../lib/user/client/user-client';
import {CONST} from     '../../lib/service/CONST';
import {multer} from    '../../lib/service/uploader';
import {Util} from '../../lib/service/utils';

// this is actually '/diners/access'
module.exports = function () {
    var router = express.Router();
    router.all('/*', app.ensureLoggedIn('/diners'));

    router.post('/add/photos', multer.array('files'), app.uploader.saveToCloudStorage.bind(app.uploader),
        (req: any, res, next) => {
            client.onUploadedPhotos(req, (err, result) => {
                if (err) return res.sendStatus(400);
                
                res.send(result);
            });
        });

    router.post('/delete/photo', (req: any, res, next) => {
            client.onDeletePhoto(req, (err, params) => {
                res.sendStatus(err ? 400 : 200);
            });
        });

    router.post('/update/photo', (req: any, res, next) => {
            client.onUpdatePhoto(req, (err, params) => {
                res.sendStatus(err ? 400 : 200);
            });
        });

    router.post('/accept-payment', multer.single('file'), (req, res, next) => {
        logging.info('lets see...');
    });
    return router;
} ();
