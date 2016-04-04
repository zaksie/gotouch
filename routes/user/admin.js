var express = require('express');
var app_1 = require('../../app');
// this is actually '/admins/access'
module.exports = function () {
    var router = express.Router();
    router.all('/*', app_1.app.ensureLoggedIn('/admins'));
    router.post('/upsert/user/pos', function (req, res, next) {
        app_1.admin.upsertPosUser(req.body, function (err, params) {
            return err ? res.sendStatus(400) : res.send(params);
        });
    });
    router.post('/send/sms-code/user/pos', function (req, res, next) {
        app_1.admin.sendSMSCodeToPOSUser(req.body, function (err) {
            var code = err ? 400 : 200;
            return res.sendStatus(code);
        });
    });
    return router;
}();
//# sourceMappingURL=admin.js.map