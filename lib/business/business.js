var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var endpoint_1 = require('../user/endpoint');
var async = require('async');
var _ = require('lodash');
exports.BUSINESS_KEY = 'Business';
exports.LOCATION_KEY = 'Location';
exports.PHOTO_KEY = 'Photo';
exports.GOOGLE_PHOTO_KEY = 'GooglePhoto';
exports.GOOGLE_INFO_KEY = 'GoogleInfo';
exports.GOOGLE_REVIEW_KEY = 'GoogleReview';
exports.GOOGLE_REVIEW_ASPECT_KEY = 'GoogleReviewAspect';
exports.GOOGLE_INFO_HASH = {
    path: [{
            kind: exports.GOOGLE_INFO_KEY,
            name: 'hash'
        }]
};
var MAX_FETCH_ALL_PAGE_SIZE = 1000;
var MAX_FETCH_ALL_CHUNK_SIZE = 100;
var DEFAULT_OPTIONS = {
    partial: true // Fetch only core info (single photo, no menus, no articles, etc.)
};
var Business = (function () {
    function Business() {
    }
    Business.prototype.getHashOfGoogleInfoRecords = function (yield_callback, final_callback) {
        var hasher = require('crypto').createHash('md5');
        var cursorGQLQuery = function (cursor, callback) {
            var gql = 'SELECT hash FROM ' + exports.GOOGLE_INFO_KEY + ' LIMIT ' + MAX_FETCH_ALL_PAGE_SIZE + ' OFFSET ' + cursor * MAX_FETCH_ALL_PAGE_SIZE;
            app_1.gapis.datastore.runGQLQuery(gql, function (err, results) { callback(err, results, cursor + 1); });
        };
        var cursor_callback = function (err, results, new_cursor) {
            var condition = results.batch.entityResults.length;
            if (!err && condition) {
                var counter = 0;
                _.forEach(results.batch.entityResults, function (res) {
                    var entity = res.entity;
                    if (!entity.properties.hash) {
                        app_1.logging.error('hash not found ' + entity.key.path[0].name);
                        entity.properties.hash = { stringValue: utils_1.Util.hash(utils_1.Util.fromProtoEntity(entity.properties)) };
                        entity.properties.placeid = { stringValue: entity.key.path[0].name };
                        app_1.gapis.datastore.upsert([entity], function (err) {
                            if (err)
                                app_1.logging.error(err);
                        });
                    }
                    else
                        hasher.update(entity.properties.hash.stringValue);
                    counter++;
                    if (counter > MAX_FETCH_ALL_CHUNK_SIZE) {
                        yield_callback(2);
                        counter = 0;
                    }
                });
                return cursorGQLQuery(new_cursor, cursor_callback);
            }
            var hash = hasher.digest('base64');
            app_1.gapis.datastore.upsert([{ key: exports.GOOGLE_INFO_HASH, properties: { hash: { stringValue: hash } } }], function (err) {
                if (err)
                    app_1.logging.error(err);
            });
            final_callback(err, hash);
        };
        app_1.gapis.datastore.lookup([exports.GOOGLE_INFO_HASH], function (err, result) {
            if (result && result.found.length)
                return final_callback(err, result.found[0].entity.properties.hash.stringValue);
            cursorGQLQuery(0, cursor_callback);
        });
    };
    Business.prototype.setHashToAll = function (final_callback) {
        var counter = 0;
        var cursorGQLQuery = function (cursor, callback, final_callback) {
            var gql = 'SELECT * FROM ' + exports.GOOGLE_INFO_KEY + ' LIMIT ' + MAX_FETCH_ALL_PAGE_SIZE + ' OFFSET ' + cursor * MAX_FETCH_ALL_PAGE_SIZE;
            app_1.gapis.datastore.runGQLQuery(gql, function (err, results) { callback(err, results, cursor + 1, final_callback); });
        };
        var cursor_callback = function (err, results, new_cursor, final_callback) {
            var condition = results.batch.entityResults.length;
            if (condition) {
                var buffer = [];
                _.forEach(results.batch.entityResults, function (res) {
                    var entity = res.entity;
                    delete entity.properties.hash;
                    entity.properties.hash = { stringValue: utils_1.Util.hash(utils_1.Util.fromProtoEntity(entity.properties)) };
                    if (!entity.properties.hash.stringValue || entity.key.path[0].name == 'ChIJAwqVuInPAhURlsGDpKwGRN8')
                        app_1.logging.error('Hash set failed ');
                    entity.properties.placeid = { stringValue: entity.key.path[0].name };
                    app_1.logging.info(counter++ + ': Add hash to ' + entity.properties.placeid.stringValue);
                    buffer.push(entity);
                    if (buffer.length > MAX_FETCH_ALL_CHUNK_SIZE) {
                        app_1.logging.info('Updating datastore...');
                        app_1.gapis.datastore.upsert(buffer, function (err) {
                            if (err)
                                app_1.logging.error(err);
                        });
                        buffer = [];
                    }
                });
                return cursorGQLQuery(new_cursor, cursor_callback, final_callback);
            }
            final_callback();
        };
        cursorGQLQuery(0, cursor_callback, final_callback);
    };
    Business.prototype.fetchAll = function (yield_callback, final_callback, options) {
        var _this = this;
        var counter = 0;
        var cursorGQLQuery = function (cursor, pass_along_cb, callback) {
            var gql = 'SELECT * FROM ' + exports.GOOGLE_INFO_KEY + ' LIMIT ' + MAX_FETCH_ALL_PAGE_SIZE + ' OFFSET ' + cursor * MAX_FETCH_ALL_PAGE_SIZE;
            app_1.gapis.datastore.runGQLQuery(gql, function (err, results) { callback(err, results, cursor + 1, pass_along_cb); });
        };
        var cursor_callback = function (err, results, new_cursor, final_callback) {
            var condition = results.batch.entityResults.length;
            if (condition) {
                var buffer = [];
                _.forEach(results.batch.entityResults, function (res) {
                    var entity = res.entity;
                    _this.setPlaceIdForGoogleInfoEntry(entity);
                    entity = utils_1.Util.fromProtoEntity(entity.properties);
                    _this.finalizeBusinessObject(entity);
                    buffer.push(entity);
                    if (buffer.length > MAX_FETCH_ALL_CHUNK_SIZE) {
                        app_1.logging.info('Fetching basic business info for admin. Batch no. ' + counter++);
                        yield_callback(buffer);
                        buffer.length = 0;
                    }
                });
                return cursorGQLQuery(new_cursor, final_callback, cursor_callback);
            }
            final_callback();
        };
        cursorGQLQuery(0, final_callback, cursor_callback);
    };
    Business.prototype.fetchMatchingEntities = function (results_in_2d_array, yield_callback, final_callback, options) {
        var _this = this;
        var results = results_in_2d_array;
        options = _.assign({}, DEFAULT_OPTIONS, options);
        if (results.length < 1)
            return final_callback(null);
        var errors = [];
        var q = async.queue(function (placeid, callback) {
            _this.fetchResultFromDatastore(placeid, callback, options);
        });
        q.drain = function () {
            app_1.logging.info('Finished fetching records. Sending to user.');
            var err = errors.length < 1 ? null : errors;
            final_callback(err);
        };
        results.forEach(function (result) {
            var placeid = _this.getPlaceId(result);
            q.push(placeid, function (err, item) {
                if (err)
                    errors.push(err);
                else if (item) {
                    var distance = Math.ceil(result[1]);
                    if (_.isArray(result) && _.isNumber(distance))
                        item.distance = distance;
                    yield_callback(item);
                }
            });
        });
    };
    Business.prototype.find = function (placeid, params, callback, tx) {
        this.fetchMatchingEntities([placeid], function (result) {
            callback(null, result);
        }, function (errs) {
            if (errs) {
                errs.forEach(function (err) {
                    app_1.logging.error(err);
                });
                callback('errors were found and reported');
            }
        }, params);
    };
    Business.prototype.getPlaceId = function (result) {
        if (typeof result == 'string')
            return result;
        return result[0].placeid.stringValue;
    };
    Business.prototype.fetchResultFromDatastore = function (placeid, callback, options) {
        var _this = this;
        var gqlQuery = 'SELECT * WHERE __key__ HAS ANCESTOR KEY(' + exports.BUSINESS_KEY + ", '" + placeid + "')";
        var businessObject = new BusinessObject();
        app_1.gapis.datastore.runGQLQuery(gqlQuery, function (err, results) {
            if (err)
                return callback(err, null);
            var entities = results.batch.entityResults;
            if (!entities.length)
                return callback();
            async.waterfall([
                // Google photos
                // Google photos
                function (callback) {
                    callback(null, _this.getGooglePhotoLinks(entities, options.partial));
                },
                // Google Info
                // Google Info
                function (googlePhotos, callback) {
                    if (googlePhotos) {
                        businessObject.photo = googlePhotos[0];
                        if (!options.partial)
                            businessObject.googlePhotos = googlePhotos;
                    }
                    _this.getGoogleInfo(entities, callback);
                },
                // Web Photos
                // Web Photos
                function (googleInfo, callback) {
                    businessObject.googleInfo = googleInfo;
                    if (googleInfo.website)
                        return _this.getWebDocuments(googleInfo.website, options.partial, callback);
                    return callback(null, null);
                },
                // Google Reviews
                // Google Reviews
                function (webDocuments, callback) {
                    if (_.values(webDocuments).length) {
                        if (webDocuments.photos)
                            businessObject.photo = businessObject.photo || webDocuments.photos[0];
                        if (!options.partial) {
                            businessObject.webPhotos = webDocuments.photos;
                            businessObject.webPdfs = webDocuments.pdfs;
                        }
                    }
                    _this.getGoogleReviews(entities, callback);
                },
                // Location
                // Location
                function (googleReviews, callback) {
                    if (googleReviews)
                        businessObject.googleReviews = googleReviews;
                    _this.getLocation(entities, callback);
                },
                // Misc
                // Misc
                function (location, callback) {
                    businessObject.location = location;
                    _this.setCoreProperties(businessObject, callback);
                },
                // Menus, Articles & all others only if !options.partial
                // Menus, Articles & all others only if !options.partial
                function (callback) {
                    if (options.partial)
                        return callback(200); //skip the next sections as they are not included in partial records
                    callback();
                },
                function (callback) {
                    // newer code uses better separation of concerns.
                    // each module should sift through the given entities and pull its own
                    app_1.app.menu.siftThrough(entities, callback);
                },
                function (menus, callback) {
                    businessObject.menus = menus || [];
                    app_1.app.article.siftThrough(entities, callback);
                },
                function (articles, callback) {
                    businessObject.articles = articles;
                    endpoint_1.media.siftThrough(entities, callback);
                },
                function (media, callback) {
                    if (!callback)
                        callback = media; //actually callback
                    else
                        businessObject.media = media;
                    callback();
                }
            ], function (err) {
                if (err == 200)
                    err = null;
                businessObject.partial = options.partial;
                _this.finalizeBusinessObject(businessObject);
                callback(err, businessObject);
            });
        });
    };
    Business.prototype.filterEntitiesFor = function (entities, kind, level) {
        var results = _.remove(entities, function (e) {
            var p = e.entity.key.path;
            if (level)
                return p[level] && p[level].kind == kind;
            return _.last(p).kind === kind;
            //the test for undefined is legacy code - OLD COMMENT
            // this doesn't make sense. some entries have id's instead of names. check if really necessary - NEW COMMENT
            //&& !_.isUndefined(level.name);
        });
        return results;
    };
    Business.prototype.getWebDocuments = function (website, partial, callback) {
        var _this = this;
        app_1.app.website.getDocuments(website, partial, function (err, documents) {
            _.forEach(documents, function (category) {
                _this.attachPhotoLinks(app_1.gapis.config.buckets.default, category);
            });
            callback(null, documents);
        });
    };
    Business.prototype.getGooglePhotoLinks = function (entities, partial) {
        var _this = this;
        var photos = this.filterEntitiesFor(entities, exports.GOOGLE_PHOTO_KEY);
        if (photos.length == 0)
            return [];
        photos = partial ? [this.constructPhoto(photos[0].entity.properties.path.stringValue)] :
            _.map(photos, function (photo) {
                return _this.constructPhoto(photo.entity.properties.path.stringValue);
            });
        this.attachPhotoLinks(app_1.gapis.config.buckets.googlePhotos, photos, true);
        return photos;
    };
    Business.prototype.constructPhoto = function (path) {
        var photo = { path: path };
        photo.tags = photo.tags || [];
        photo.title = photo.title || "";
        photo.type = photo.path.substring(photo.path.length - 3).toUpperCase();
        return photo;
    };
    Business.prototype.attachPhotoLinks = function (bucketName, photos, dontIncludeThumbnail) {
        photos.forEach(function (photo) {
            _.assign(photo, app_1.gapis.storage.getLink(bucketName, photo.path, dontIncludeThumbnail));
        });
    };
    Business.prototype.getGoogleInfo = function (entities, callback) {
        var entity = this.filterEntitiesFor(entities, exports.GOOGLE_INFO_KEY)[0].entity;
        this.setPlaceIdForGoogleInfoEntry(entity);
        var googleInfo = utils_1.Util.fromProtoEntity(entity.properties);
        callback(null, googleInfo);
    };
    Business.prototype.setPlaceIdForGoogleInfoEntry = function (entity) {
        try {
            entity.properties.placeid = { stringValue: entity.key.path[1].name.substring(1) };
        }
        catch (e) {
            app_1.logging.error('ERROR in setPlaceIdForGoogleInfoEntry');
        }
    };
    Business.prototype.getGoogleReviews = function (entities, callback) {
        var _this = this;
        var reviewResults = this.filterEntitiesFor(entities, exports.GOOGLE_REVIEW_KEY);
        var googleReviews = _.map(reviewResults, function (result) {
            var review = utils_1.Util.fromProtoEntity(result.entity.properties);
            var id = result.entity.key.path[2].name;
            review.aspects = _this.getReviewAspects(entities, id);
            return review;
        });
        callback(null, googleReviews);
    };
    Business.prototype.getReviewAspects = function (entities, id) {
        var reviewAspectResults = this.filterEntitiesFor(entities, exports.GOOGLE_REVIEW_ASPECT_KEY);
        var googleReviewAspects = _.map(reviewAspectResults, function (result) {
            if (result.entity.key.path[2].name == id) {
                var aspect = utils_1.Util.fromProtoEntity(result.entity.properties);
                return aspect;
            }
        });
        return googleReviewAspects;
    };
    Business.prototype.getLocation = function (entities, callback) {
        var entity = this.filterEntitiesFor(entities, exports.LOCATION_KEY)[0].entity;
        var location = utils_1.Util.fromProtoEntity(entity.properties);
        callback(null, location.location);
    };
    Business.prototype.setCoreProperties = function (businessObject, callback) {
        businessObject.placeid = businessObject.googleInfo.placeid;
        businessObject.name = businessObject.googleInfo.name;
        businessObject.address = businessObject.googleInfo.address;
        businessObject.phoneNumber = businessObject.googleInfo.phone_number;
        businessObject.defaultTip = '10%';
        businessObject.rating = businessObject.googleInfo.rating;
        callback();
    };
    Business.prototype.finalizeBusinessObject = function (entry /*non proto*/) {
        entry.fullname = entry.name + ' - ' + entry.address;
        entry.hash = utils_1.Util.hash(entry);
        entry.photo = entry.photo || { title: 'No photo', image: '/public/images/notfound.jpg', thumbnail: '/public/images/notfound.jpg' };
    };
    return Business;
})();
exports.Business = Business;
var BusinessObject = (function () {
    function BusinessObject() {
    }
    return BusinessObject;
})();
exports.BusinessObject = BusinessObject;
//# sourceMappingURL=business.js.map