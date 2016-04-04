var express = require('express');
var path = require('path');
var app_1 = require('../app');
module.exports = (function () {
    var router = express.Router();
    var appTitle = 'yummlet';
    var devicePath;
    // Use the oauth middleware to automatically get the user's profile
    // information and expose login/logout URLs to templates.
    //router.use(oauth2.aware);
    //router.use(oauth2.template);
    router.use(function (req, res, next) {
        devicePath = 'md/';
        var ua = req.header('user-agent');
        var isMobile = false;
        if (/mobile/i.test(ua)) {
            isMobile = true;
            devicePath = 'xs/';
        }
        req.isMobile = isMobile;
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
        var user_type = convertUserType(req.params.user_type);
        var route = '../public/app.' + user_type + '/';
        if (!user_type)
            return next();
        var options = {
            root: path.join(__dirname, route)
        };
        res.sendFile('index.html', options);
    });
    router.get('/print', function (req, res, next) {
        res.render('print-test', { title: appTitle });
    });
    router.get('/unsubscribe', function (req, res, next) {
        app_1.app.user.ofType().unsubscribe(req.query, function (err, url) {
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
//# sourceMappingURL=index.js.map