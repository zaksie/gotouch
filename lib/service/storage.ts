import {logging, config} from '../../app';
import {Util, THUMBNAIL} from '../service/utils';
import PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var request = require('request');
var gapis;
const DAY = 1000 * 3600 * 24;
const MINIMUM_VALID_SIZE = 25;
export class CloudStorage {
    private memcache = new Memcache();
    constructor(gapisInstance) {
        gapis = gapisInstance;
        logging.info('Cloud Storage configured');
        PubSub.publish('CloudStorage.ready', true);
    }

    getLink(bucketname, path, dontIncludeThumbnail) {
        if (!path) {
            logging.error('storage.getLink called with null path');
            return null;
        }
        let result = {
            image: this.getPublicUrl(bucketname + '/' + path)
        } as any;
        result.thumbnail = dontIncludeThumbnail ? result.image : this.getPublicUrl(bucketname + '/' + Util.addPreextension(path, THUMBNAIL));
        
        return result;
        /* ******** ALL PHOTOS HAVE BEEN MADE PUBLICALLY READABLE (02/12/2015)*/
    }

    getSignedLink(bucketname, path, thumbnail, callback) {
        if (!path)
            return callback('File path is empty');
        if (thumbnail)
            path = Util.addPreextension(path, THUMBNAIL);

        let now = new Date();
        now.setHours(now.getHours() + 2);
        this.getSignedLinkAux(now, bucketname, path, callback);
    }

    getSignedLinkAux(time, bucketname, path, callback) {
        try {
            let link = this.memcache.get(bucketname, path);
            if (link)
                return callback(null, link);
            var file = this.createFile(bucketname, path);
            file.getSignedUrl({
                action: 'read',
                expires: time.toString()
            }, (err, result) => {
                if (!err)
                    this.memcache.insert(bucketname, path, time, result);
                callback(err, result);
            });
        }
        catch (e)
        {
            logging.error(e);
            callback();
        }
    }

    getPublicUrl(path) {
        if (path.bucket) //meaning path is actually a 'file' object
            path = path.bucket.name + '/' + path.name;
        return 'https://storage.googleapis.com/' + path;
    }
    createFile(filename, bucketname?) {
        if (!bucketname)
            bucketname = config.buckets.default;
        
        return gapis.gcloud.storage().bucket(bucketname).file(filename);
    }

    upload(localpath, cloudpath, callback, bucketname?) {
        if (!bucketname)
            bucketname = config.buckets.default;

        var options = {
            destination: cloudpath,
            resumable: true,
            validation: 'crc32c',
            gzip:true
        };

        gapis.gcloud.storage().bucket(bucketname).upload(localpath, options, callback);
    }
    downloadAndUploadImage(sourceUrl, bucketname, destFileName, callback) {
        var file = this.createFile(bucketname, destFileName);

        request
            .get(sourceUrl)
            .on('error', (err) => {
                logging.warn('Could not fetch image ' + sourceUrl, err);
                callback(err);
            })
            .pipe(file.createWriteStream({ gzip: true }))
            .on('finish', () => {
                logging.info('Uploaded image ' + destFileName);
                file.makePublic(function () {
                    callback(null, this.getPublicUrl(destFileName));
                });
            })
            .on('error', (err) => {
                logging.error('Could not upload image', err);
                callback(err);
            });
    }
}

class Memcache {
    entries;
    constructor() {
        this.entries = [];
        this.cleanup();
    }
    insert(bucket, path, expiry, link) {
        this.entries.push({
            bucket: bucket,
            path: path,
            expiry: expiry,
            link: link
        });
    }

    get(bucket, path) {
        let now = new Date();
        now.setHours(now.getHours());
        let entry = _.find(this.entries, (entry) => {
            return entry.bucket === bucket && entry.path === path
                && entry.expiry > now;
        });

        if (!entry)
            return null;
        else
            return entry.link;
    }

    cleanup() {
        setInterval(function() {
            let now = new Date();
            this.entries = _.uniq(_.filter(this.entries, (entry) => {
                return entry.expiry > now;
            }), (entry) => {
                return entry.bucket + entry.path;
                });
        }.bind(this), DAY);
    }
}
