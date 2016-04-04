var app_1 = require('../../app');
var sendgrid = require('sendgrid')(process.env.SENDGRID_API_KEY);
var jade = require('jade');
exports.BLACK_LISTED_EMAIL_KEY = 'BlacklistedEmail';
(function (From) {
    From[From["ADMIN_ATALLENBY"] = 0] = "ADMIN_ATALLENBY";
    From[From["ADMIN_YUMMLET"] = 0] = "ADMIN_YUMMLET";
})(exports.From || (exports.From = {}));
var From = exports.From;
;
var FROM = ['admin@at-allenby.com'];
var TO_ME = 'at.allenby@gmail.com';
var Mailer = (function () {
    function Mailer() {
    }
    Mailer.prototype.send = function (subject, html, from, to, callback) {
        var _this = this;
        this.checkIfNotBlacklisted(to, function (err, isBlacklisted) {
            if (err)
                return callback(err);
            if (isBlacklisted)
                return callback(new Error('BLACKLISTED'));
            sendgrid.send(_this.createArgs(subject, html, from, to), callback);
        });
    };
    Mailer.prototype.sendActivation = function (data, callback) {
        data.logo_url = app_1.config.dns + '/public/images/logo.png';
        var html = jade.renderFile('./lib/email-templates/activation.jade', data);
        this.send('Activate your account at yummlet.com', html, From.ADMIN_YUMMLET, data.email, callback);
    };
    Mailer.prototype.sendResetPassword = function (data, callback) {
        data.logo_url = app_1.config.dns + '/public/images/logo.png';
        var html = jade.renderFile('./lib/email-templates/reset-password.jade', data);
        this.send('Reset your account password for yummlet.com', html, From.ADMIN_YUMMLET, data.email, callback);
    };
    Mailer.prototype.sendContactRequest = function (subject, html, callback) {
        this.send(subject, html, From.ADMIN_YUMMLET, TO_ME, callback);
    };
    Mailer.prototype.checkIfNotBlacklisted = function (to, callback) {
        var mid_callback = function (err, result) {
            if (err)
                return callback(err);
            callback(null, result.found.length);
        };
        var keys = [{
                path: [{ kind: exports.BLACK_LISTED_EMAIL_KEY, name: to }]
            }];
        app_1.gapis.datastore.lookup(keys, mid_callback, null);
    };
    Mailer.prototype.createArgs = function (subject, html, from, to) {
        var options = {
            from: FROM[from],
            to: to,
            subject: subject,
            html: html
        };
        return options;
    };
    return Mailer;
})();
exports.Mailer = Mailer;
//# sourceMappingURL=mailer.js.map