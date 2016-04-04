import express = require('express');
import path = require('path');
import {TOTP} from '../Scripts/ts/TOTP';
import {app, logging} from '../app';


interface ICustomRequest extends express.Request {
    isMobile: boolean;
}

module.exports = (function () {
    var router = express.Router();
    var appTitle = 'yummlet';
    var devicePath;
    // Use the oauth middleware to automatically get the user's profile
    // information and expose login/logout URLs to templates.
    //router.use(oauth2.aware);
    //router.use(oauth2.template);

    router.use((req, res, next) => {
        devicePath = 'md/';
        let ua = req.header('user-agent');
        let isMobile = false;
        if (/mobile/i.test(ua)) {
            isMobile = true;
            devicePath = 'xs/';
        }
        (req as ICustomRequest).isMobile = isMobile;
        next();
    });

    /* GET home page. */
    router.get('/', function (req, res, next) {
        res.redirect('/pilot');
    });

    router.get('/main', function (req, res) {
        res.render('frontpage', { title: appTitle });
    });
    
    // Good for debugging
    //router.get('*', (req, res, next) => {
    //    logging.info('GET: ' + req.path);
    //    next();
    //});


    router.get('/:user_type', function (req, res, next) {
        let user_type = convertUserType(req.params.user_type);
        let route = '../public/app.' + user_type + '/';
        if (!user_type) return next();
        let options = {
            root: path.join(__dirname, route)
        };
        res.sendFile('index.html', options);
    });

    router.get('/print', (req, res, next)=> {
        res.render('print-test', { title: appTitle });
    });
    router.get('/unsubscribe', (req, res, next) => {
        app.user.ofType().unsubscribe(req.query, (err, url) => {
            // TODO: ignore url for now
            if (err)
                return res.redirect('/error');
            res.render('unsubscribe-success', { title: 'Unsubscribed successfully' });
        });
    });

    function convertUserType(type) {
        switch (type) {
            case 'diners':
                return 'client';
            case 'chefs':
                return 'pos';
            case 'admins':
                return 'admin';
            case 'pilot':
                return 'pilot';
            default:
                return null;
        }
    }
    return router;
})();