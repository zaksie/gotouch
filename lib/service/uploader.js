// Copyright 2015, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var app_1 = require('../../app');
var utils_1 = require('./utils');
var path = require('path');
var request = require('request');
var Multer = require('multer');
exports.MAX_ALLOWED_UPLOAD_SIZE = 20 * 1024 * 1024;
exports.USER_UPLOADS_FOLDER = 'user-uploads';
var storage = Multer.memoryStorage();
var _ = require('lodash');
var util = require('util');
var fs = require('fs');
var mkdirp = require('mkdirp');
exports.multer = Multer({
    storage: storage,
    limits: { fileSize: exports.MAX_ALLOWED_UPLOAD_SIZE, files: 20 }
});
exports.TEMP_UPLOAD_PATH = 'tmp/upload/';
var Uploader = (function () {
    // Multer handles parsing multipart/form-data requests.
    // This instance is configured to store images in memory and re-name to avoid
    // conflicting with existing objects. This makes it straightforward to upload
    // to Cloud Storage.
    function Uploader() {
        app_1.logging.info('Multer configured');
    }
    // [END download_and_upload]
    // Express middleware that will automatically pass uploads to Cloud Storage.
    // Each file in req.files is processed and will have two new properties:
    // * ``cloudStorageObject`` the object name in cloud storage.
    // * ``cloudStoragePublicUrl`` the public url to the object.
    Uploader.prototype.saveToLocalDrive = function (req, res, next) {
        this.saveUploads(req, res, next, this.saveToLocalDriveAux.bind(this));
    };
    Uploader.prototype.saveToCloudStorage = function (req, res, next) {
        this.saveUploads(req, res, next, this.saveToCloudStorageAux.bind(this));
    };
    Uploader.prototype.saveUploads = function (req, res, next, func) {
        var numFiles = Object.keys(req.files).length;
        if (!numFiles)
            return next();
        var checkNext = function () {
            numFiles--;
            if (numFiles === 0)
                next();
        };
        var user_id = req.user[req.user_route].id;
        _.forEach(req.files, function (uploadedFile) {
            uploadedFile.originalname = utils_1.Util.replaceWhiteSpaces(uploadedFile.originalname);
            func({
                uploadedFile: uploadedFile,
                user_id: user_id,
                req: req,
                route: req.user_route
            }, checkNext);
        });
    };
    Uploader.prototype.saveToCloudStorageAux = function (params, callback) {
        var filepath = exports.USER_UPLOADS_FOLDER + params.route + '/' + params.user_id + '/' + utils_1.Util.getNowDateForFile() + '/' + params.uploadedFile.originalname;
        app_1.logging.info('Saving to ' + filepath);
        var file = app_1.gapis.storage.createFile(filepath);
        var stream = file.createWriteStream({ gzip: true });
        stream.on('error', function (err) {
            params.uploadedFile.cloudStorageError = err;
            app_1.logging.error(err);
            callback();
        }).on('finish', function () {
            params.uploadedFile.cloudStorageObject = file;
            params.uploadedFile.cloudStoragePublicUrl = app_1.gapis.storage.getPublicUrl(file);
            app_1.logging.info('Finished streaming ' + params.uploadedFile.originalname);
            file.makePublic(callback);
        });
        stream.end(params.uploadedFile.buffer);
    };
    Uploader.prototype.saveToLocalDriveAux = function (params, callback) {
        var rootdir = path.join(exports.TEMP_UPLOAD_PATH, params.user_id, utils_1.Util.getNowDateForFile());
        var local_filepath = path.join(rootdir, params.uploadedFile.originalname);
        mkdirp.sync(rootdir);
        var wstream = fs.createWriteStream(local_filepath, { defaultEncoding: 'binary' });
        wstream.write(params.uploadedFile.buffer, function (err) {
            if (err)
                app_1.logging.error(err);
            delete params.uploadedFile.buffer;
            callback();
        });
        params.req.local_uploaded_files = (params.req.local_uploaded_files || []).concat([local_filepath]);
    };
    return Uploader;
})();
exports.Uploader = Uploader;
//# sourceMappingURL=uploader.js.map