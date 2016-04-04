import {logging, gapis, config, app} from '../../app';
import PubSub = require('pubsub-js');
import {Media, MEDIA_KIND} from '../business/media';

var async = require('async');

export var media = new Media();

export abstract class Endpoint {
    abstract ROUTE();

    protected abstract canDeleteMedia(req, photo);
    protected abstract canUpdateMedia(req, photos);




    //////// GENERAL //////////////////
    ensure(socket, callback) {
        this.handshake(socket, null, callback);
    }
    logError(err) {
        if (err) { logging.error(err); return true; }
        else return false;
    }

    getCookie(socket) {
        var c = socket.request[config.cookie.default.name];
        if (socket.request.user)
            c.user = socket.request.user;
        return c;
    }

    //////// COMMON FEATURES //////////
    handshake(socket, data, callback) {
        var end = (err?, user?) => {
            if (user)
                logging.info(this.ROUTE() + ' user authenticated');
            callback(err, { user: user, cookie: cookie, isLoggedIn: user ? user.username : false });
        }

        logging.info(this.ROUTE() + ' - checking authentication');
        var cookie = this.getCookie(socket);
        if (!cookie.id) return callback();
        if (cookie.user && cookie.user[this.ROUTE()])
            return end(null, cookie.user[this.ROUTE()]);

        end();
    }

    onUploadedPhotos(req, final_callback) {
        let results = [];
        this.queue(req.files, (file, callback) => {
            media.create(MEDIA_KIND.Photo, { placeid: req.body.placeid, route: this.ROUTE(), image: file.cloudStoragePublicUrl, username: req.user[req.user_route].username, time: (new Date()).toISOString() }, callback);
        }, (err, result) => {
                if (result) results.push(result);
            }, () => {
                final_callback(null, results);
            });
    }

    onDeletePhoto(req, callback) {
        let photo = JSON.parse(req.body.photo);
        media.delete(photo, this.canDeleteMedia.bind(this, req), callback);
    }


    onUpdatePhoto(req, final_callback) {
        let photos = JSON.parse(req.body.photos);
        if (!_.isArray(photos))
            photos = [photos];

        this.queue(photos, (photo, callback) => {
            media.update(photo, this.canUpdateMedia.bind(this, req), callback);
        }, null, final_callback);

    }

    queue(iteratees, func, yield_callback, final_callback) {
        var q = async.queue(func.bind(this));

        q.drain = () => {
            if (final_callback)
                final_callback();
        }

        iteratees.forEach((iteratee) => {
            q.push(iteratee, (err, result) => {
                if (err)
                    logging.error(err);
                if (yield_callback)
                    yield_callback(err, result);
            });
        });
    }

}