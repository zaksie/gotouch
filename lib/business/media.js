var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var business_1 = require('./business');
var user_pos_1 = require('../user/pos/user-pos');
var user_client_1 = require('../user/client/user-client');
var _ = require('lodash');
var async = require('async');
exports.MEDIA_FILE_KIND = 'MediaFile';
exports.PHOTO_FILE_KIND = 'PhotoFile';
exports.MEDIA_PREFIX = 'media_';
(function (MEDIA_KIND) {
    MEDIA_KIND[MEDIA_KIND["Photo"] = 0] = "Photo";
})(exports.MEDIA_KIND || (exports.MEDIA_KIND = {}));
var MEDIA_KIND = exports.MEDIA_KIND;
;
var Media = (function () {
    function Media() {
    }
    Media.prototype.create = function (kind, params, callback) {
        params.kind = this.getKindName(kind);
        var entry = this.constructEntry(params);
        app_1.gapis.datastore.insertAutoId([entry], function (err) {
            callback(err, err ? null : utils_1.Util.fromProtoEntityWithKey(entry));
        });
    };
    Media.prototype.permissionTest = function (err, lookupResult, testFunction, callback) {
        if (err)
            return callback(err);
        if (!lookupResult.found.length)
            return callback('No photo was found');
        var serverPhoto = utils_1.Util.fromProtoEntityWithKey(lookupResult.found[0].entity);
        if (!testFunction(serverPhoto))
            return callback(401);
        callback();
    };
    Media.prototype.delete = function (photo, test, callback) {
        var action = function (photo, serverPhoto, callback) {
            app_1.gapis.datastore.delete([photo.key], callback);
        };
        this.mutatePhoto(photo, test, action, callback);
    };
    Media.prototype.mutatePhoto = function (photo, test, action, callback) {
        var _this = this;
        if (!photo.key)
            return callback('Missing photo key');
        app_1.gapis.datastore.lookup([photo.key], function (err, result) {
            _this.permissionTest(err, result, test, function (err) {
                if (err)
                    return callback(err);
                action(photo, result.found[0].entity, callback);
            });
        });
    };
    Media.prototype.update = function (photo, test, callback) {
        var action = function (photo, serverPhotoProto, callback) {
            var serverPhoto = utils_1.Util.fromProtoEntity(serverPhotoProto.properties);
            _.assign(serverPhoto, photo);
            utils_1.Util.toProtoEntity(serverPhotoProto.properties, photo, true);
            app_1.gapis.datastore.upsert([serverPhotoProto], callback);
        };
        this.mutatePhoto(photo, test, action, callback);
    };
    Media.prototype.fetchAll = function (placeid, callback) {
        var _this = this;
        var gql = 'SELECT * WHERE __key__ HAS ANCESTOR Key(' + business_1.BUSINESS_KEY + ',"' + placeid + '", ' + exports.MEDIA_FILE_KIND + ',"' + exports.MEDIA_PREFIX + placeid + '")';
        app_1.gapis.datastore.runGQLQuery(gql, function (err, results) {
            if (err)
                return callback(err);
            var photos = utils_1.Util.fromProtoEntities(results.batch.entityResults, true);
            var retval = _this.sortPhotosByUserType(photos);
            callback(null, retval);
        });
    };
    Media.prototype.siftThrough = function (entities, callback) {
        var photosEntities = app_1.app.business.filterEntitiesFor(entities, exports.MEDIA_FILE_KIND, 1);
        var photos = utils_1.Util.fromProtoEntities(photosEntities, true);
        var retval = this.sortPhotosByUserType(photos);
        callback(null, retval);
    };
    Media.prototype.sortPhotosByUserType = function (photos) {
        return {
            pos: {
                photoLinks: _.filter(photos, function (photo) {
                    return photo.route == user_pos_1.POS_USER_ROUTE;
                })
            },
            client: {
                photoLinks: _.filter(photos, function (photo) {
                    return photo.route == user_client_1.CLIENT_USER_ROUTE;
                })
            }
        };
    };
    Media.prototype.constructKey = function (params) {
        return {
            path: [{ kind: business_1.BUSINESS_KEY, name: params.placeid },
                { kind: exports.MEDIA_FILE_KIND, name: exports.MEDIA_PREFIX + params.placeid },
                { kind: params.kind }]
        };
    };
    Media.prototype.constructEntry = function (params) {
        params.type = params.type || utils_1.Util.extractExtension(params.image);
        var key = this.constructKey(params);
        var properties = {};
        utils_1.Util.toProtoEntity(properties, params);
        utils_1.Util.filter(properties);
        return {
            key: key, properties: properties
        };
    };
    Media.prototype.getKindName = function (kind) {
        switch (kind) {
            case MEDIA_KIND.Photo:
                return exports.PHOTO_FILE_KIND;
        }
    };
    return Media;
})();
exports.Media = Media;
//# sourceMappingURL=media.js.map