import {logging, gapis, config, duid, app} from '../../app';
import {Util, OS_BATCH_RUN_PREFIX, THUMBNAIL} from '../service/utils';
import PubSub = require('pubsub-js');
var async = require('async');
var util = require('util'),
    fs = require('fs'),
    _ = require('lodash');
var child_process = require('child_process');
var mkdirp = require('mkdirp');
var gm = require('gm');

export class Graphics {
    constructor() {
    }

    convertAndPipeToCloud(params, final_callback) {
        let results = {} as any;
        async.series([
            // jpg
            (callback) => {
                if (!params.jpg) return callback();
                let dest = Util.replaceExtension(params.dest, 'jpg');
                let file = gapis.storage.createFile(dest);
                results.jpg = gapis.storage.getPublicUrl(file);
                let writeStream = file.createWriteStream({ gzip: true });
                gm(params.src).density(300, 300).setFormat("jpg").size((err2, size) => {
                    if (err2) return callback(err2);
                        results.width = size.width;
                        results.height = size.height;
                }).stream().pipe(writeStream).on('finish', (err) => {
                    if (err) return callback(err);
                    if (file) return file.makePublic(callback);
                    callback('gm failed to create jpg file');
                });
            },
            // png
            (callback) => {
                if (!params.png) return callback();
                let dest = Util.replaceExtension(params.dest, 'png');
                let file = gapis.storage.createFile(dest);
                results.png = gapis.storage.getPublicUrl(file);
                let writeStream = file.createWriteStream({ gzip: true });
                gm(params.src).density(300, 300).setFormat("png").stream().pipe(writeStream).on('finish', (err) => {
                    if (err) return callback(err);
                    if (file) return file.makePublic(callback);
                    callback('gm failed to create png file');
                });
            },
            // thumbnail
            (callback) => {
                if (!params.thumbnail) return callback();
                let dest = Util.replaceExtension(params.dest, 'jpg');
                dest = Util.addPreextension(dest, THUMBNAIL);
                let file = gapis.storage.createFile(dest);
                results.thumbnail = gapis.storage.getPublicUrl(file);
                let writeStream = file.createWriteStream({ gzip: true });
                gm(params.src).resize(200)
                    .gravity('Center')
                    .extent(200, 200)
                    .setFormat("jpg").stream().pipe(writeStream).on('finish', (err) => {
                        if (err) return callback(err);
                        if (file) return file.makePublic(callback);
                        callback('gm failed to create thumbnail file');
                    });
            }], (err) => {
                final_callback(err, !err ? results : null);
            });
    }
}