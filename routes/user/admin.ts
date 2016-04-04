import express = require('express');
import path = require('path');
import {app, logging, config, passport, admin} from '../../app';
import PubSub = require('pubsub-js');
import {ADMIN_USER_ROUTE} from '../../lib/user/admin/user-admin';
import {CONST} from '../../lib/service/CONST';

// this is actually '/admins/access'
module.exports = function () {
    var router = express.Router();
    router.all('/*', app.ensureLoggedIn('/admins'));

    router.post('/upsert/user/pos', (req: any, res, next) => {
        admin.upsertPosUser(req.body, (err, params) => {
            return err ? res.sendStatus(400) : res.send(params);
            
        });
    });

    router.post('/send/sms-code/user/pos', (req: any, res, next) => {
        admin.sendSMSCodeToPOSUser(req.body, (err) => {
            let code = err ? 400 : 200;
            return res.sendStatus(code);
        });
    });
    
    return router;
} ();
