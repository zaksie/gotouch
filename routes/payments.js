var express = require('express');
var app_1 = require('../app');
var PubSub = require('pubsub-js');
var CONST_1 = require('../lib/service/CONST');
var user_client_1 = require('../lib/user/client/user-client');
module.exports = function () {
    var router = express.Router();
    // Not all routes require being logged in
    router.all('/*', app_1.app.ensureLoggedIn('/diners'));
    router.post('/cc', function (req, res, next) {
        var username = (req.user && req.user[user_client_1.CLIENT_USER_ROUTE]) ? req.user[user_client_1.CLIENT_USER_ROUTE].username : req[app_1.config.cookie.default.name].id;
        var tab = JSON.parse(req.body.tab);
        var url = req.headers.referer;
        PubSub.publish(CONST_1.CONST.PubSub.OrderApproved, tab);
        res.sendStatus(200);
    });
    router.post('/paypal/pay', function (req, res, next) {
        var username = (req.user && req.user[user_client_1.CLIENT_USER_ROUTE]) ? req.user[user_client_1.CLIENT_USER_ROUTE].username : req[app_1.config.cookie.default.name].id;
        var tab = JSON.parse(req.body.tab);
        var url = req.headers.referer;
        return res.sendStatus(400);
        app_1.app.paypal.beginTransaction(username, url, tab, function (err, result) {
            if (err)
                return res.status(500).send('Server error');
            res.send(result);
        });
    });
    router.get('/paypal/return', function (req, res, next) {
        app_1.app.paypal.returnCallback(req.query, function (err, url, order) {
            var status = err ? 500 : 200;
            if (status == 200) {
                var tab = JSON.parse(order);
                PubSub.publish(CONST_1.CONST.PubSub.OrderApproved, tab);
            }
            res.redirect(status, url);
        });
    });
    router.get('/paypal/cancel', function (req, res, next) {
        app_1.app.paypal.cancelCallback(req.query, function (err, url) {
            res.redirect(402, url);
        });
    });
    return router;
}();
//# sourceMappingURL=payments.js.map