var express = require('express');
var app_1 = require('../../app');
var uploader_1 = require('../../lib/service/uploader');
// this is actually '/diners/access'
module.exports = function () {
    var router = express.Router();
    router.all('/*', app_1.app.ensureLoggedIn('/diners'));
    router.post('/add/photos', uploader_1.multer.array('files'), app_1.app.uploader.saveToCloudStorage.bind(app_1.app.uploader), function (req, res, next) {
        app_1.client.onUploadedPhotos(req, function (err, result) {
            if (err)
                return res.sendStatus(400);
            res.send(result);
        });
    });
    router.post('/delete/photo', function (req, res, next) {
        app_1.client.onDeletePhoto(req, function (err, params) {
            res.sendStatus(err ? 400 : 200);
        });
    });
    router.post('/update/photo', function (req, res, next) {
        app_1.client.onUpdatePhoto(req, function (err, params) {
            res.sendStatus(err ? 400 : 200);
        });
    });
    router.post('/accept-payment', uploader_1.multer.single('file'), function (req, res, next) {
        app_1.logging.info('lets see...');
    });
    return router;
}();
//# sourceMappingURL=client.js.map