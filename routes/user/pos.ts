import express = require('express');
import path = require('path');
import {app, logging, config, passport, pos} from '../../app';
import PubSub = require('pubsub-js');
import {POS_USER_ROUTE} from '../../lib/user/pos/user-pos';
import {CONST} from     '../../lib/service/CONST';
import {multer} from    '../../lib/service/uploader';
import {Util} from '../../lib/service/utils';

// this is actually '/chefs/access'
module.exports = function () {
    var router = express.Router();
    router.all('/*', app.ensureLoggedIn('/chefs'));

    router.post('/add/menu', multer.array('files'), (req, res, next) => {
        if (!req.body.placeid || !req.body.title || !req.body.name || !req.body.description || !req.body.menu_type)
            return res.sendStatus(500);

        req.body.name = Util.replaceWhiteSpaces(req.body.name);
        
        console.time('/add/menu');
        app.menu.isExists(req.body.placeid, req.body.name, (err, exists) => {
            if (err) return res.sendStatus(500);
            if (exists) return res.sendStatus(403);
            
            next();
        });
    }, app.uploader.saveToLocalDrive.bind(app.uploader), (req: any, res, next) => {
            pos.onUploadedMenuPages(req, (err, params) => {
                res.sendStatus(err ? 400 : 200);
            });
    });

    router.post('/add/photos', multer.array('files'), app.uploader.saveToCloudStorage.bind(app.uploader),
        (req: any, res, next) => {
            pos.onUploadedPhotos(req, (err, result) => {
                if (err) return res.sendStatus(400);

                res.send(result);
            });
        });

    router.post('/delete/photo', (req: any, res, next) => {
        pos.onDeletePhoto(req, (err, params) => {
            res.sendStatus(err ? 400 : 200);
        });
    });

    router.post('/update/photo', (req: any, res, next) => {
        pos.onUpdatePhoto(req, (err, params) => {
            res.sendStatus(err ? 400 : 200);
        });
    });

    router.post('/accept-payment', multer.single('file'), (req, res, next) => {
        logging.info('lets see...');
    });
    return router;
} ();
