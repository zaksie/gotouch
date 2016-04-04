import express = require('express');
import path = require('path');
import {app, logging, config, passport} from '../app';
import PubSub = require('pubsub-js');
import {CONST} from '../lib/service/CONST';
import {CLIENT_USER_ROUTE} from '../lib/user/client/user-client';
module.exports = function () {
    var router = express.Router();
    // Not all routes require being logged in
    router.all('/*', app.ensureLoggedIn('/diners'));

    router.post('/cc', (req: any, res, next) => {
        let username = (req.user && req.user[CLIENT_USER_ROUTE]) ? req.user[CLIENT_USER_ROUTE].username : req[config.cookie.default.name].id;
        let tab = JSON.parse(req.body.tab);
        let url = req.headers.referer;
        PubSub.publish(CONST.PubSub.OrderApproved, tab);
        res.sendStatus(200);
    });
    router.post('/paypal/pay', (req: any, res, next) => {
        let username = (req.user && req.user[CLIENT_USER_ROUTE]) ? req.user[CLIENT_USER_ROUTE].username : req[config.cookie.default.name].id;
        let tab = JSON.parse(req.body.tab);
        let url = req.headers.referer; 

        return res.sendStatus(400);

        app.paypal.beginTransaction(username, url, tab, (err, result) => {
            if (err)
                return res.status(500).send('Server error');

            res.send(result);
        });
    });

    router.get('/paypal/return', (req, res, next) => {
        app.paypal.returnCallback(req.query, (err, url, order) => {
            let status = err ? 500 : 200;
            if (status == 200) {
                let tab = JSON.parse(order);
                PubSub.publish(CONST.PubSub.OrderApproved, tab);
            }
            res.redirect(status, url);
        });
    });

    router.get('/paypal/cancel', (req, res, next) => {
        app.paypal.cancelCallback(req.query, (err, url) => {
            res.redirect(402, url);
        });
    });

    return router;
} ();
