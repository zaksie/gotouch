import {logging, gapis, config, client, duid, app} from '../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../service/utils';
import {media} from '../user/endpoint';

var async = require('async');
var _ = require('lodash');
export const BUSINESS_KEY = 'Business';
export const LOCATION_KEY = 'Location';
export const PHOTO_KEY = 'Photo';
export const GOOGLE_PHOTO_KEY = 'GooglePhoto';
export const GOOGLE_INFO_KEY = 'GoogleInfo';
export const GOOGLE_REVIEW_KEY = 'GoogleReview';
export const GOOGLE_REVIEW_ASPECT_KEY = 'GoogleReviewAspect';
export const GOOGLE_INFO_HASH = {
    path: [{
        kind: GOOGLE_INFO_KEY,
        name: 'hash'
    }]
};
const MAX_FETCH_ALL_PAGE_SIZE = 1000;
const MAX_FETCH_ALL_CHUNK_SIZE = 100;
const DEFAULT_OPTIONS = {
    partial: true // Fetch only core info (single photo, no menus, no articles, etc.)
};
export class Business {
    getHashOfGoogleInfoRecords(yield_callback, final_callback) {
        var hasher = require('crypto').createHash('md5');

        var cursorGQLQuery = (cursor, callback) => {
            let gql = 'SELECT hash FROM ' + GOOGLE_INFO_KEY + ' LIMIT ' + MAX_FETCH_ALL_PAGE_SIZE + ' OFFSET ' + cursor * MAX_FETCH_ALL_PAGE_SIZE;
            gapis.datastore.runGQLQuery(gql, (err, results) => { callback(err, results, cursor + 1) });
        }

        var cursor_callback = (err, results, new_cursor) => {
            let condition = results.batch.entityResults.length;
            if (!err && condition) {
                let counter = 0;
                _.forEach(results.batch.entityResults, (res) => {
                    let entity = res.entity;
                    if (!entity.properties.hash)
                    {
                        logging.error('hash not found ' + entity.key.path[0].name);
                        entity.properties.hash = { stringValue: Util.hash(Util.fromProtoEntity(entity.properties)) };
                        entity.properties.placeid = { stringValue: entity.key.path[0].name };
                        gapis.datastore.upsert([entity], (err) => {
                            if (err)
                                logging.error(err);
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
            let hash = hasher.digest('base64');
            gapis.datastore.upsert([{ key: GOOGLE_INFO_HASH, properties: { hash: { stringValue: hash } } }], (err) => {
                if (err) logging.error(err);
            });
            final_callback(err, hash);
        }

        gapis.datastore.lookup([GOOGLE_INFO_HASH], (err, result) => {
            if (result && result.found.length)
                return final_callback(err, result.found[0].entity.properties.hash.stringValue);
            cursorGQLQuery(0, cursor_callback);
        });
    }
    setHashToAll(final_callback) {
        var counter = 0;
        var cursorGQLQuery = (cursor, callback, final_callback) => {
            let gql = 'SELECT * FROM ' + GOOGLE_INFO_KEY + ' LIMIT ' + MAX_FETCH_ALL_PAGE_SIZE + ' OFFSET ' + cursor * MAX_FETCH_ALL_PAGE_SIZE;
            gapis.datastore.runGQLQuery(gql, (err, results) => { callback(err, results, cursor + 1, final_callback) });
        }

        var cursor_callback = (err, results, new_cursor, final_callback) => {
            let condition = results.batch.entityResults.length;
            if (condition) {
                let buffer = [];
                _.forEach(results.batch.entityResults, (res) => {
                    let entity = res.entity;
                    delete entity.properties.hash;
                    entity.properties.hash = { stringValue: Util.hash(Util.fromProtoEntity(entity.properties)) };
                    if (!entity.properties.hash.stringValue || entity.key.path[0].name == 'ChIJAwqVuInPAhURlsGDpKwGRN8')
                        logging.error('Hash set failed ');
                    entity.properties.placeid = { stringValue: entity.key.path[0].name };
                    logging.info(counter++ + ': Add hash to ' + entity.properties.placeid.stringValue);
                    buffer.push(entity);
                    if (buffer.length > MAX_FETCH_ALL_CHUNK_SIZE) {
                        logging.info('Updating datastore...');
                        gapis.datastore.upsert(buffer, (err) => {
                            if (err)
                                logging.error(err);
                        });
                        buffer = [];
                    }
                    
                });
                return cursorGQLQuery(new_cursor, cursor_callback, final_callback);
            }

            final_callback();
        }

        cursorGQLQuery(0, cursor_callback, final_callback);
    }

    fetchAll(yield_callback, final_callback, options?) {
        var counter = 0;
        var cursorGQLQuery = (cursor, pass_along_cb, callback) => {
            let gql = 'SELECT * FROM ' + GOOGLE_INFO_KEY + ' LIMIT ' + MAX_FETCH_ALL_PAGE_SIZE + ' OFFSET ' + cursor * MAX_FETCH_ALL_PAGE_SIZE;
            gapis.datastore.runGQLQuery(gql, (err, results) => { callback(err, results, cursor + 1, pass_along_cb) });
        }

        var cursor_callback = (err, results, new_cursor, final_callback) => {
            let condition = results.batch.entityResults.length;
            if (condition) {
                let buffer = [];
                _.forEach(results.batch.entityResults, (res) => {
                    let entity = res.entity;
                    this.setPlaceIdForGoogleInfoEntry(entity);
                    entity = Util.fromProtoEntity(entity.properties);
                    this.finalizeBusinessObject(entity);
                    buffer.push(entity);
                    if (buffer.length > MAX_FETCH_ALL_CHUNK_SIZE) {
                        logging.info('Fetching basic business info for admin. Batch no. ' + counter++);

                        yield_callback(buffer);
                        buffer.length = 0;
                    }
                });
                return cursorGQLQuery(new_cursor, final_callback, cursor_callback);
            }

            final_callback();
        }

        cursorGQLQuery(0, final_callback, cursor_callback);
    }

    fetchMatchingEntities(results_in_2d_array, yield_callback, final_callback, options?){
        let results = results_in_2d_array;
        options = _.assign({}, DEFAULT_OPTIONS, options); 
        if (results.length < 1)
            return final_callback(null);
        var errors = [];
        var q = async.queue((placeid, callback) => {
            this.fetchResultFromDatastore(placeid, callback, options);
        });

        q.drain = () => {
            logging.info('Finished fetching records. Sending to user.');
            let err = errors.length < 1 ? null : errors;
            final_callback(err);
        }

        results.forEach((result) => {
            var placeid = this.getPlaceId(result);
            q.push(placeid, (err, item) => {
                if (err)
                    errors.push(err);
                else if (item) {
                    let distance = Math.ceil(result[1]);
                    if (_.isArray(result) && _.isNumber(distance))
                        item.distance = distance;
                    yield_callback(item);
                }
            });
        });
    }

    find(placeid, params, callback, tx) {
        this.fetchMatchingEntities([placeid], (result) => {
            callback(null, result);
        }, (errs) => {
            if (errs) {
                errs.forEach((err) => {
                    logging.error(err);
                });
                callback('errors were found and reported');
            }
        }, params);
    }

    private getPlaceId(result) {
        if (typeof result == 'string') /*result: new format*/
            return result;
        return result[0].placeid.stringValue;
    }
    private fetchResultFromDatastore(placeid, callback, options) {
        var gqlQuery = 'SELECT * WHERE __key__ HAS ANCESTOR KEY(' + BUSINESS_KEY + ", '" + placeid + "')";
        var businessObject = new BusinessObject();
        gapis.datastore.runGQLQuery(gqlQuery, (err, results) => {
            if (err)
                return callback(err, null);
            let entities = results.batch.entityResults;
            if (!entities.length)
                return callback();
            async.waterfall([
                // Google photos
                (callback) => {
                    callback(null, this.getGooglePhotoLinks(entities, options.partial));
                },
                // Google Info
                (googlePhotos, callback) => {
                    if (googlePhotos) {
                        businessObject.photo = googlePhotos[0];
                        if (!options.partial)
                            businessObject.googlePhotos = googlePhotos;
                    }
                    this.getGoogleInfo(entities, callback);
                },
                // Web Photos
                (googleInfo, callback) => {
                    businessObject.googleInfo = googleInfo;
                    if (googleInfo.website)
                        return this.getWebDocuments(googleInfo.website, options.partial, callback);
                    return callback(null, null);
                },
                // Google Reviews
                (webDocuments, callback) => {
                    if (_.values(webDocuments).length) {
                        if (webDocuments.photos)
                            businessObject.photo = businessObject.photo || webDocuments.photos[0];
                        if (!options.partial) {
                            businessObject.webPhotos = webDocuments.photos;
                            businessObject.webPdfs = webDocuments.pdfs;
                        }
                    }
                    this.getGoogleReviews(entities, callback);
                },
                // Location
                (googleReviews, callback) => {
                    if (googleReviews)
                    businessObject.googleReviews = googleReviews;
                    this.getLocation(entities, callback);
                },
                // Misc
                (location, callback) => {
                    businessObject.location = location;
                    this.setCoreProperties(businessObject, callback);
                },
                // Menus, Articles & all others only if !options.partial
                (callback) => {
                    if (options.partial)
                        return callback(200); //skip the next sections as they are not included in partial records
                    callback();
                },
                (callback) => {
                    // newer code uses better separation of concerns.
                    // each module should sift through the given entities and pull its own
                    app.menu.siftThrough(entities, callback);
                },
                (menus, callback) => {
                    businessObject.menus = menus || [];
                    app.article.siftThrough(entities, callback);
                },
                (articles, callback) => {
                    businessObject.articles = articles;
                    media.siftThrough(entities, callback);
                },
                (media, callback) => {
                    if (!callback)
                        callback = media; //actually callback
                    else
                        businessObject.media = media;
                    callback();
                }
            ],
                (err) => {
                    if (err == 200) err = null;
                    businessObject.partial = options.partial;
                    this.finalizeBusinessObject(businessObject)
                    callback(err, businessObject);
                });
        });
    }

    private filterEntitiesFor(entities, kind, level?) {
        let results = _.remove(entities, (e) => {
            let p = e.entity.key.path;
            if (level)
                return p[level] && p[level].kind == kind;
            return _.last(p).kind === kind;
                    //the test for undefined is legacy code - OLD COMMENT
                    // this doesn't make sense. some entries have id's instead of names. check if really necessary - NEW COMMENT
                    //&& !_.isUndefined(level.name);
        });

        return results;
    }

    private getWebDocuments(website, partial, callback) {
        app.website.getDocuments(website, partial, (err, documents) => {
            _.forEach(documents, (category)=>{
                this.attachPhotoLinks(gapis.config.buckets.default, category);
            });
            callback(null, documents);
        });
    }

    private getGooglePhotoLinks(entities, partial) {
        let photos = this.filterEntitiesFor(entities, GOOGLE_PHOTO_KEY);
        if (photos.length == 0)
            return [];
        photos = partial ? [this.constructPhoto(photos[0].entity.properties.path.stringValue)] :
            _.map(photos, (photo) => {
                return this.constructPhoto(photo.entity.properties.path.stringValue);
            });
        this.attachPhotoLinks(gapis.config.buckets.googlePhotos, photos, true);
        return photos;
    }
    private constructPhoto(path) {
        let photo = { path: path } as any;
        photo.tags = photo.tags || [];
        photo.title = photo.title|| "";
        photo.type = photo.path.substring(photo.path.length - 3).toUpperCase();
        return photo;
    }
    private attachPhotoLinks(bucketName, photos, dontIncludeThumbnail?) {
        photos.forEach((photo) => {
            _.assign(photo, gapis.storage.getLink(bucketName, photo.path, dontIncludeThumbnail));
        });
    }

    private getGoogleInfo(entities, callback) {
        let entity = this.filterEntitiesFor(entities, GOOGLE_INFO_KEY)[0].entity;
        this.setPlaceIdForGoogleInfoEntry(entity);
        let googleInfo = Util.fromProtoEntity(entity.properties);
        callback(null, googleInfo);
    }
    private setPlaceIdForGoogleInfoEntry(entity) {
        try {
            entity.properties.placeid = { stringValue: entity.key.path[1].name.substring(1) };
        }
        catch (e) {
            logging.error('ERROR in setPlaceIdForGoogleInfoEntry');
        }
    }

    private getGoogleReviews(entities, callback) {
        let reviewResults = this.filterEntitiesFor(entities, GOOGLE_REVIEW_KEY);
        let googleReviews = _.map(reviewResults, (result) => {
            let review = Util.fromProtoEntity(result.entity.properties);
            let id = result.entity.key.path[2].name;
            review.aspects = this.getReviewAspects(entities, id);
            return review;
        });
        callback(null, googleReviews);
    }

    private getReviewAspects(entities, id) {
        let reviewAspectResults = this.filterEntitiesFor(entities, GOOGLE_REVIEW_ASPECT_KEY);
        let googleReviewAspects = _.map(reviewAspectResults, (result) => {
            if (result.entity.key.path[2].name == id) {
                let aspect = Util.fromProtoEntity(result.entity.properties);
                return aspect;
            }
        });
        return googleReviewAspects;
    }

    private getLocation(entities, callback) {
        let entity = this.filterEntitiesFor(entities, LOCATION_KEY)[0].entity;
        let location = Util.fromProtoEntity(entity.properties);
        callback(null, location.location);
    }

    private setCoreProperties(businessObject: BusinessObject, callback) {
        businessObject.placeid = businessObject.googleInfo.placeid;
        businessObject.name = businessObject.googleInfo.name;
        businessObject.address = businessObject.googleInfo.address;
        businessObject.phoneNumber = businessObject.googleInfo.phone_number;
        businessObject.defaultTip = '10%';
        businessObject.rating = businessObject.googleInfo.rating;
        callback();
    }

    private finalizeBusinessObject(entry/*non proto*/) {
        entry.fullname = entry.name + ' - ' + entry.address;
        entry.hash = Util.hash(entry);
        entry.photo = entry.photo || { title: 'No photo', image: '/public/images/notfound.jpg', thumbnail: '/public/images/notfound.jpg' };
    }
}

export class BusinessObject {
    placeid;
    googleInfo;
    googlePhotos;
    webPhotos;
    webPdfs;
    googleReviews;
    location;
    name;
    fullname;
    photo;
    rating;
    defaultTip;
    address;
    phoneNumber;
    menus;
    articles;
    partial;
    hash;
    media;
}
