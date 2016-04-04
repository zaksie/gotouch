var app_1 = require('../../app');
var media_1 = require('../business/media');
var async = require('async');
exports.media = new media_1.Media();
var Endpoint = (function () {
    function Endpoint() {
    }
    //////// GENERAL //////////////////
    Endpoint.prototype.ensure = function (socket, callback) {
        this.handshake(socket, null, callback);
    };
    Endpoint.prototype.logError = function (err) {
        if (err) {
            app_1.logging.error(err);
            return true;
        }
        else
            return false;
    };
    Endpoint.prototype.getCookie = function (socket) {
        var c = socket.request[app_1.config.cookie.default.name];
        if (socket.request.user)
            c.user = socket.request.user;
        return c;
    };
    //////// COMMON FEATURES //////////
    Endpoint.prototype.handshake = function (socket, data, callback) {
        var _this = this;
        var end = function (err, user) {
            if (user)
                app_1.logging.info(_this.ROUTE() + ' user authenticated');
            callback(err, { user: user, cookie: cookie, isLoggedIn: user ? user.username : false });
        };
        app_1.logging.info(this.ROUTE() + ' - checking authentication');
        var cookie = this.getCookie(socket);
        if (!cookie.id)
            return callback();
        if (cookie.user && cookie.user[this.ROUTE()])
            return end(null, cookie.user[this.ROUTE()]);
        end();
    };
    Endpoint.prototype.onUploadedPhotos = function (req, final_callback) {
        var _this = this;
        var results = [];
        this.queue(req.files, function (file, callback) {
            exports.media.create(media_1.MEDIA_KIND.Photo, { placeid: req.body.placeid, route: _this.ROUTE(), image: file.cloudStoragePublicUrl, username: req.user[req.user_route].username, time: (new Date()).toISOString() }, callback);
        }, function (err, result) {
            if (result)
                results.push(result);
        }, function () {
            final_callback(null, results);
        });
    };
    Endpoint.prototype.onDeletePhoto = function (req, callback) {
        var photo = JSON.parse(req.body.photo);
        exports.media.delete(photo, this.canDeleteMedia.bind(this, req), callback);
    };
    Endpoint.prototype.onUpdatePhoto = function (req, final_callback) {
        var _this = this;
        var photos = JSON.parse(req.body.photos);
        if (!_.isArray(photos))
            photos = [photos];
        this.queue(photos, function (photo, callback) {
            exports.media.update(photo, _this.canUpdateMedia.bind(_this, req), callback);
        }, null, final_callback);
    };
    Endpoint.prototype.queue = function (iteratees, func, yield_callback, final_callback) {
        var q = async.queue(func.bind(this));
        q.drain = function () {
            if (final_callback)
                final_callback();
        };
        iteratees.forEach(function (iteratee) {
            q.push(iteratee, function (err, result) {
                if (err)
                    app_1.logging.error(err);
                if (yield_callback)
                    yield_callback(err, result);
            });
        });
    };
    return Endpoint;
})();
exports.Endpoint = Endpoint;
//# sourceMappingURL=endpoint.js.map