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

import {gapis, config, logging, app} from '../../app'; 
import {Util} from './utils';
var path = require('path');
var request = require('request');
var Multer = require('multer');
export const MAX_ALLOWED_UPLOAD_SIZE = 20 * 1024 * 1024;
export const USER_UPLOADS_FOLDER = 'user-uploads';
var storage = Multer.memoryStorage();
var _ = require('lodash');
var util = require('util');
var fs = require('fs');
var mkdirp = require('mkdirp');
export var multer = Multer({
    storage: storage,
    limits: { fileSize: MAX_ALLOWED_UPLOAD_SIZE, files: 20 }
});
export const TEMP_UPLOAD_PATH = 'tmp/upload/';
export class Uploader {

    // Multer handles parsing multipart/form-data requests.
    // This instance is configured to store images in memory and re-name to avoid
    // conflicting with existing objects. This makes it straightforward to upload
    // to Cloud Storage.
    constructor() {
        logging.info('Multer configured');
    }
    // [END download_and_upload]
    // Express middleware that will automatically pass uploads to Cloud Storage.
    // Each file in req.files is processed and will have two new properties:
    // * ``cloudStorageObject`` the object name in cloud storage.
    // * ``cloudStoragePublicUrl`` the public url to the object.

    saveToLocalDrive(req, res, next) {
        this.saveUploads(req, res, next, this.saveToLocalDriveAux.bind(this));
    }

    saveToCloudStorage(req, res, next) {
        this.saveUploads(req, res, next, this.saveToCloudStorageAux.bind(this));
    }

    saveUploads(req, res, next, func) {

        var numFiles = Object.keys(req.files).length;
        if (!numFiles) return next();

        var checkNext = () => {
            numFiles--;
            if (numFiles === 0)
                next();
        };
        let user_id = req.user[req.user_route].id;
        _.forEach(req.files, (uploadedFile) => {
            uploadedFile.originalname = Util.replaceWhiteSpaces(uploadedFile.originalname);
            func({
                uploadedFile: uploadedFile,
                user_id: user_id,
                req: req,
                route: req.user_route
            }, checkNext);
        });
    }
    saveToCloudStorageAux(params, callback) {
        var filepath = USER_UPLOADS_FOLDER + params.route + '/' + params.user_id + '/' + Util.getNowDateForFile() + '/' + params.uploadedFile.originalname;

        logging.info('Saving to ' + filepath);
        var file = gapis.storage.createFile(filepath);
        var stream = file.createWriteStream({ gzip: true });
        stream.on('error', function (err) {
            params.uploadedFile.cloudStorageError = err;
            logging.error(err);
            callback();
        }).on('finish', function () {
            params.uploadedFile.cloudStorageObject = file;
            params.uploadedFile.cloudStoragePublicUrl = gapis.storage.getPublicUrl(file);
            logging.info('Finished streaming ' + params.uploadedFile.originalname);
            file.makePublic(callback);
        });

        stream.end(params.uploadedFile.buffer);
    }

    saveToLocalDriveAux(params, callback) {
        let rootdir = path.join(TEMP_UPLOAD_PATH, params.user_id, Util.getNowDateForFile());
        let local_filepath = path.join(rootdir, params.uploadedFile.originalname);
        mkdirp.sync(rootdir);
        var wstream = fs.createWriteStream(local_filepath, { defaultEncoding: 'binary' });
        wstream.write(params.uploadedFile.buffer, (err) => {
            if (err) logging.error(err);
            delete params.uploadedFile.buffer;
            callback();
        });

        params.req.local_uploaded_files = (params.req.local_uploaded_files || []).concat([local_filepath]);
    }
}

