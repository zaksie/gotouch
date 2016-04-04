import {app, logging, config, client, passport, csrfProtection} from '../../app';
import express = require('express');
import path = require('path');
import {Util} from '../../lib/service/utils';
import {Google, Facebook, GOOGLE, FACEBOOK} from '../../lib/user/user';
var _ = require('lodash');

module.exports = function () {
    var router = express.Router();

    router.post('/:user_type/logout', (req: any, res, next) => {
        req._logout(req.params.user_type, (err) => {
            if (err) {
                logging.error('Failed to log user out', err);
                return res.sendStatus(500);
            }
            res.sendStatus(200);
        });
    });
    router.post('/:user_type/support', (req, res, next) => {
        app.user.ofType(req.params.user_type).requestSupport(req.body, (err, url) => {
            if (err) {
                logging.error(err);
                return res.status(500).send('Error filing support request. Try again later.');
            }
            res.sendStatus(200);
        });
    });

    router.post('/pilot/register', (req, res, next) => {
        app.user.ofType('chefs').registerForPilot(req.body, (err, url) => {
            if (err) {
                logging.error(err);
                return res.status(500).send('Error filing support request. Try again later.');
            }
            res.sendStatus(200);
        });
    });

    router.get('/:user_type/activation', (req, res, next) => {
        app.user.ofType(req.params.user_type).activateAccount(req.query, (err, url, user) => {
            if(err)
                return res.redirect('/error');
            let passportFormat = app.user.ofType(req.params.user_type).toPassportFormat(user);
            req.login(passportFormat, (err) => { if (err) logging.error(err) });
            res.redirect(url);
        });
    });

    router.get('/invalidactivation', (req, res, next) => {
        res.render('invalid-activation-link', { title: 'Invalid activation' });
    });

    router.post('/:user_type/reset', (req, res, next) => {
        app.captcha.verifyAfterNTries(req, res, next);
    }, (req, res, next) => {
        app.user.ofType(req.params.user_type).sendResetLink(req.body.username, (err) => {
            if (err) logging.error(err);
        });
        res.sendStatus(200);
    });

    router.get('/:user_type/reset/link', csrfProtection, (req:any, res, next) => {
        app.user.ofType(req.params.user_type).resetPassword(req.query, (err, valid, coded_username) => {
            if (err || !valid)
                return res.redirect('/error');
            if (valid)
                res.render('reset-password', { csrfToken: req.csrfToken(), username: coded_username });
        });
    });


    router.post('/:user_type/reset/newpassword', csrfProtection, (req, res, next) => {
        app.user.ofType(req.params.user_type).changePassword(req.body.username, req.body.password, (err, ok) => {
            if(err || !ok)
                return res.redirect('/error');
            res.redirect('/');
        });
    });
    function getUserRoute(req) {
        return '/' + req.params.user_type;
    }

    router.post('/:user_type/yummlet', (req, res, next) => {
        app.captcha.verifyAfterNTries(req, res, next);
    }, (req, res, next) => {
        passport.authenticate(getUserRoute(req))(req, res, next);
        }, (req, res, next) => {
            app.user.ofType(req.params.user_type).on1stFactorSuccess(req, res, next);
        }, (req, res, next) => {
            app.captcha.clearTryHistory(req);
            res.send(req.user[getUserRoute(req)]);
        });

    router.post('/:user_type/register', (req, res, next) => {
        app.captcha.verifyAfterNTries(req, res, next);
    }, (req :any, res, next) => {
        app.user.ofType(req.params.user_type).isRegistrationAllowed(req.body, (err, allowed, params) => {
            let code = err ? 500 : 412;
            req.anchor = params;
            if (allowed) return next();

            res.sendStatus(code);
        });
    }, (req, res, next) => {
        app.user.ofType(req.params.user_type).checkIfUsernameExists(req.body.username, (err, exist) => {
            if (err)
                return res.sendStatus(500);

            if (exist)
                return res.sendStatus(403);

            next();
        });
    }, (req:any, res, next) => {
        var register_callback = (err) => {
            if (err)
                return res.sendStatus(500);
            return res.sendStatus(200);
        }
        app.user.ofType(req.params.user_type).register(register_callback, req[config.cookie.default.name].id, req.body.username, req.body.password, req.body.username/*username is also the email*/, null, null, req.anchor);
    });

    router.post('/:user_type/social', (req, res, next) => {
        let provider = (() => {
            switch (req.body.how) {
                case GOOGLE:
                    return new Google();
                case FACEBOOK:
                    return new Facebook();
                default:
                    throw new Error('no provider set');
            }
        })();
        app.user.ofType(req.params.user_type).socialLogin({
            provider: provider,
            req: req,
            cookie: req[config.cookie.default.name],
            profile: req.body
        }, (err, user) => {
            if (err)
                if (_.isNumber(err)) return res.sendStatus(err);
                else res.sendStatus(500);
            if (!user) return res.sendStatus(401);

            res.send(user);
        });
    });
    router.post('/:user_type/test', (req, res, next) => {
        req[config.cookie.default.name].test = true;
        res.sendStatus(200);
    });
    return router;
} ();