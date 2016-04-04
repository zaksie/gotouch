var app_1 = require('../../app');
var express = require('express');
var user_1 = require('../../lib/user/user');
var _ = require('lodash');
module.exports = function () {
    var router = express.Router();
    router.post('/:user_type/logout', function (req, res, next) {
        req._logout(req.params.user_type, function (err) {
            if (err) {
                app_1.logging.error('Failed to log user out', err);
                return res.sendStatus(500);
            }
            res.sendStatus(200);
        });
    });
    router.post('/:user_type/support', function (req, res, next) {
        app_1.app.user.ofType(req.params.user_type).requestSupport(req.body, function (err, url) {
            if (err) {
                app_1.logging.error(err);
                return res.status(500).send('Error filing support request. Try again later.');
            }
            res.sendStatus(200);
        });
    });
    router.post('/pilot/register', function (req, res, next) {
        app_1.app.user.ofType('chefs').registerForPilot(req.body, function (err, url) {
            if (err) {
                app_1.logging.error(err);
                return res.status(500).send('Error filing support request. Try again later.');
            }
            res.sendStatus(200);
        });
    });
    router.get('/:user_type/activation', function (req, res, next) {
        app_1.app.user.ofType(req.params.user_type).activateAccount(req.query, function (err, url, user) {
            if (err)
                return res.redirect('/error');
            var passportFormat = app_1.app.user.ofType(req.params.user_type).toPassportFormat(user);
            req.login(passportFormat, function (err) { if (err)
                app_1.logging.error(err); });
            res.redirect(url);
        });
    });
    router.get('/invalidactivation', function (req, res, next) {
        res.render('invalid-activation-link', { title: 'Invalid activation' });
    });
    router.post('/:user_type/reset', function (req, res, next) {
        app_1.app.captcha.verifyAfterNTries(req, res, next);
    }, function (req, res, next) {
        app_1.app.user.ofType(req.params.user_type).sendResetLink(req.body.username, function (err) {
            if (err)
                app_1.logging.error(err);
        });
        res.sendStatus(200);
    });
    router.get('/:user_type/reset/link', app_1.csrfProtection, function (req, res, next) {
        app_1.app.user.ofType(req.params.user_type).resetPassword(req.query, function (err, valid, coded_username) {
            if (err || !valid)
                return res.redirect('/error');
            if (valid)
                res.render('reset-password', { csrfToken: req.csrfToken(), username: coded_username });
        });
    });
    router.post('/:user_type/reset/newpassword', app_1.csrfProtection, function (req, res, next) {
        app_1.app.user.ofType(req.params.user_type).changePassword(req.body.username, req.body.password, function (err, ok) {
            if (err || !ok)
                return res.redirect('/error');
            res.redirect('/');
        });
    });
    function getUserRoute(req) {
        return '/' + req.params.user_type;
    }
    router.post('/:user_type/yummlet', function (req, res, next) {
        app_1.app.captcha.verifyAfterNTries(req, res, next);
    }, function (req, res, next) {
        app_1.passport.authenticate(getUserRoute(req))(req, res, next);
    }, function (req, res, next) {
        app_1.app.user.ofType(req.params.user_type).on1stFactorSuccess(req, res, next);
    }, function (req, res, next) {
        app_1.app.captcha.clearTryHistory(req);
        res.send(req.user[getUserRoute(req)]);
    });
    router.post('/:user_type/register', function (req, res, next) {
        app_1.app.captcha.verifyAfterNTries(req, res, next);
    }, function (req, res, next) {
        app_1.app.user.ofType(req.params.user_type).isRegistrationAllowed(req.body, function (err, allowed, params) {
            var code = err ? 500 : 412;
            req.anchor = params;
            if (allowed)
                return next();
            res.sendStatus(code);
        });
    }, function (req, res, next) {
        app_1.app.user.ofType(req.params.user_type).checkIfUsernameExists(req.body.username, function (err, exist) {
            if (err)
                return res.sendStatus(500);
            if (exist)
                return res.sendStatus(403);
            next();
        });
    }, function (req, res, next) {
        var register_callback = function (err) {
            if (err)
                return res.sendStatus(500);
            return res.sendStatus(200);
        };
        app_1.app.user.ofType(req.params.user_type).register(register_callback, req[app_1.config.cookie.default.name].id, req.body.username, req.body.password, req.body.username /*username is also the email*/, null, null, req.anchor);
    });
    router.post('/:user_type/social', function (req, res, next) {
        var provider = (function () {
            switch (req.body.how) {
                case user_1.GOOGLE:
                    return new user_1.Google();
                case user_1.FACEBOOK:
                    return new user_1.Facebook();
                default:
                    throw new Error('no provider set');
            }
        })();
        app_1.app.user.ofType(req.params.user_type).socialLogin({
            provider: provider,
            req: req,
            cookie: req[app_1.config.cookie.default.name],
            profile: req.body
        }, function (err, user) {
            if (err)
                if (_.isNumber(err))
                    return res.sendStatus(err);
                else
                    res.sendStatus(500);
            if (!user)
                return res.sendStatus(401);
            res.send(user);
        });
    });
    router.post('/:user_type/test', function (req, res, next) {
        req[app_1.config.cookie.default.name].test = true;
        res.sendStatus(200);
    });
    return router;
}();
//# sourceMappingURL=login.js.map