var express = require('express');
var app_1 = require('../../app');
var uploader_1 = require('../../lib/service/uploader');
var utils_1 = require('../../lib/service/utils');
// this is actually '/chefs/access'
module.exports = function () {
    var router = express.Router();
    router.all('/*', app_1.app.ensureLoggedIn('/chefs'));
    router.post('/add/menu', uploader_1.multer.array('files'), function (req, res, next) {
        if (!req.body.placeid || !req.body.title || !req.body.name || !req.body.description || !req.body.menu_type)
            return res.sendStatus(500);
        req.body.name = utils_1.Util.replaceWhiteSpaces(req.body.name);
        console.time('/add/menu');
        app_1.app.menu.isExists(req.body.placeid, req.body.name, function (err, exists) {
            if (err)
                return res.sendStatus(500);
            if (exists)
                return res.sendStatus(403);
            next();
        });
    }, app_1.app.uploader.saveToLocalDrive.bind(app_1.app.uploader), function (req, res, next) {
        app_1.pos.onUploadedMenuPages(req, function (err, params) {
            res.sendStatus(err ? 400 : 200);
        });
    });
    router.post('/add/photos', uploader_1.multer.array('files'), app_1.app.uploader.saveToCloudStorage.bind(app_1.app.uploader), function (req, res, next) {
        app_1.pos.onUploadedPhotos(req, function (err, result) {
            if (err)
                return res.sendStatus(400);
            res.send(result);
        });
    });
    router.post('/delete/photo', function (req, res, next) {
        app_1.pos.onDeletePhoto(req, function (err, params) {
            res.sendStatus(err ? 400 : 200);
        });
    });
    router.post('/update/photo', function (req, res, next) {
        app_1.pos.onUpdatePhoto(req, function (err, params) {
            res.sendStatus(err ? 400 : 200);
        });
    });
    router.post('/accept-payment', uploader_1.multer.single('file'), function (req, res, next) {
        app_1.logging.info('lets see...');
    });
    return router;
}();
//# sourceMappingURL=pos.js.map