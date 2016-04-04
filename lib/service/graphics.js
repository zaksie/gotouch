var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var async = require('async');
var util = require('util'), fs = require('fs'), _ = require('lodash');
var child_process = require('child_process');
var mkdirp = require('mkdirp');
var gm = require('gm');
var Graphics = (function () {
    function Graphics() {
    }
    Graphics.prototype.convertAndPipeToCloud = function (params, final_callback) {
        var results = {};
        async.series([
            // jpg
            // jpg
            function (callback) {
                if (!params.jpg)
                    return callback();
                var dest = utils_1.Util.replaceExtension(params.dest, 'jpg');
                var file = app_1.gapis.storage.createFile(dest);
                results.jpg = app_1.gapis.storage.getPublicUrl(file);
                var writeStream = file.createWriteStream({ gzip: true });
                gm(params.src).density(300, 300).setFormat("jpg").size(function (err2, size) {
                    if (err2)
                        return callback(err2);
                    results.width = size.width;
                    results.height = size.height;
                }).stream().pipe(writeStream).on('finish', function (err) {
                    if (err)
                        return callback(err);
                    if (file)
                        return file.makePublic(callback);
                    callback('gm failed to create jpg file');
                });
            },
            // png
            // png
            function (callback) {
                if (!params.png)
                    return callback();
                var dest = utils_1.Util.replaceExtension(params.dest, 'png');
                var file = app_1.gapis.storage.createFile(dest);
                results.png = app_1.gapis.storage.getPublicUrl(file);
                var writeStream = file.createWriteStream({ gzip: true });
                gm(params.src).density(300, 300).setFormat("png").stream().pipe(writeStream).on('finish', function (err) {
                    if (err)
                        return callback(err);
                    if (file)
                        return file.makePublic(callback);
                    callback('gm failed to create png file');
                });
            },
            // thumbnail
            // thumbnail
            function (callback) {
                if (!params.thumbnail)
                    return callback();
                var dest = utils_1.Util.replaceExtension(params.dest, 'jpg');
                dest = utils_1.Util.addPreextension(dest, utils_1.THUMBNAIL);
                var file = app_1.gapis.storage.createFile(dest);
                results.thumbnail = app_1.gapis.storage.getPublicUrl(file);
                var writeStream = file.createWriteStream({ gzip: true });
                gm(params.src).resize(200)
                    .gravity('Center')
                    .extent(200, 200)
                    .setFormat("jpg").stream().pipe(writeStream).on('finish', function (err) {
                    if (err)
                        return callback(err);
                    if (file)
                        return file.makePublic(callback);
                    callback('gm failed to create thumbnail file');
                });
            }], function (err) {
            final_callback(err, !err ? results : null);
        });
    };
    return Graphics;
})();
exports.Graphics = Graphics;
//# sourceMappingURL=graphics.js.map