var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var request = require('request');
var gapis;
var DAY = 1000 * 3600 * 24;
var MINIMUM_VALID_SIZE = 25;
var CloudStorage = (function () {
    function CloudStorage(gapisInstance) {
        this.memcache = new Memcache();
        gapis = gapisInstance;
        app_1.logging.info('Cloud Storage configured');
        PubSub.publish('CloudStorage.ready', true);
    }
    CloudStorage.prototype.getLink = function (bucketname, path, dontIncludeThumbnail) {
        if (!path) {
            app_1.logging.error('storage.getLink called with null path');
            return null;
        }
        var result = {
            image: this.getPublicUrl(bucketname + '/' + path)
        };
        result.thumbnail = dontIncludeThumbnail ? result.image : this.getPublicUrl(bucketname + '/' + utils_1.Util.addPreextension(path, utils_1.THUMBNAIL));
        return result;
        /* ******** ALL PHOTOS HAVE BEEN MADE PUBLICALLY READABLE (02/12/2015)*/
    };
    CloudStorage.prototype.getSignedLink = function (bucketname, path, thumbnail, callback) {
        if (!path)
            return callback('File path is empty');
        if (thumbnail)
            path = utils_1.Util.addPreextension(path, utils_1.THUMBNAIL);
        var now = new Date();
        now.setHours(now.getHours() + 2);
        this.getSignedLinkAux(now, bucketname, path, callback);
    };
    CloudStorage.prototype.getSignedLinkAux = function (time, bucketname, path, callback) {
        var _this = this;
        try {
            var link = this.memcache.get(bucketname, path);
            if (link)
                return callback(null, link);
            var file = this.createFile(bucketname, path);
            file.getSignedUrl({
                action: 'read',
                expires: time.toString()
            }, function (err, result) {
                if (!err)
                    _this.memcache.insert(bucketname, path, time, result);
                callback(err, result);
            });
        }
        catch (e) {
            app_1.logging.error(e);
            callback();
        }
    };
    CloudStorage.prototype.getPublicUrl = function (path) {
        if (path.bucket)
            path = path.bucket.name + '/' + path.name;
        return 'https://storage.googleapis.com/' + path;
    };
    CloudStorage.prototype.createFile = function (filename, bucketname) {
        if (!bucketname)
            bucketname = app_1.config.buckets.default;
        return gapis.gcloud.storage().bucket(bucketname).file(filename);
    };
    CloudStorage.prototype.upload = function (localpath, cloudpath, callback, bucketname) {
        if (!bucketname)
            bucketname = app_1.config.buckets.default;
        var options = {
            destination: cloudpath,
            resumable: true,
            validation: 'crc32c',
            gzip: true
        };
        gapis.gcloud.storage().bucket(bucketname).upload(localpath, options, callback);
    };
    CloudStorage.prototype.downloadAndUploadImage = function (sourceUrl, bucketname, destFileName, callback) {
        var file = this.createFile(bucketname, destFileName);
        request
            .get(sourceUrl)
            .on('error', function (err) {
            app_1.logging.warn('Could not fetch image ' + sourceUrl, err);
            callback(err);
        })
            .pipe(file.createWriteStream({ gzip: true }))
            .on('finish', function () {
            app_1.logging.info('Uploaded image ' + destFileName);
            file.makePublic(function () {
                callback(null, this.getPublicUrl(destFileName));
            });
        })
            .on('error', function (err) {
            app_1.logging.error('Could not upload image', err);
            callback(err);
        });
    };
    return CloudStorage;
})();
exports.CloudStorage = CloudStorage;
var Memcache = (function () {
    function Memcache() {
        this.entries = [];
        this.cleanup();
    }
    Memcache.prototype.insert = function (bucket, path, expiry, link) {
        this.entries.push({
            bucket: bucket,
            path: path,
            expiry: expiry,
            link: link
        });
    };
    Memcache.prototype.get = function (bucket, path) {
        var now = new Date();
        now.setHours(now.getHours());
        var entry = _.find(this.entries, function (entry) {
            return entry.bucket === bucket && entry.path === path
                && entry.expiry > now;
        });
        if (!entry)
            return null;
        else
            return entry.link;
    };
    Memcache.prototype.cleanup = function () {
        setInterval(function () {
            var now = new Date();
            this.entries = _.uniq(_.filter(this.entries, function (entry) {
                return entry.expiry > now;
            }), function (entry) {
                return entry.bucket + entry.path;
            });
        }.bind(this), DAY);
    };
    return Memcache;
})();
//# sourceMappingURL=storage.js.map