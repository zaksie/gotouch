import {logging, config, gapis, app, admin} from '../../app';
import {Util} from '../service/utils';
import {BUSINESS_KEY} from './business';
import {POS_USER_ROUTE} from '../user/pos/user-pos';
import {CLIENT_USER_ROUTE} from '../user/client/user-client';

var _ = require('lodash');
var async = require('async');

export const MEDIA_FILE_KIND = 'MediaFile';
export const PHOTO_FILE_KIND = 'PhotoFile';
export const MEDIA_PREFIX = 'media_';
export enum MEDIA_KIND { Photo };

export class Media {
    constructor() {

    }
    create(kind: MEDIA_KIND, params, callback) {
        params.kind = this.getKindName(kind);
        let entry = this.constructEntry(params);
        gapis.datastore.insertAutoId([entry], (err) => {
            callback(err, err ? null : Util.fromProtoEntityWithKey(entry));
        });
    }

    permissionTest(err, lookupResult, testFunction, callback) {
        if (err) return callback(err);
        if (!lookupResult.found.length) return callback('No photo was found');
        let serverPhoto = Util.fromProtoEntityWithKey(lookupResult.found[0].entity);
        if (!testFunction(serverPhoto)) return callback(401);
        callback();
    }

    delete(photo, test, callback) {
        let action = (photo, serverPhoto, callback) => {
            gapis.datastore.delete([photo.key], callback);
        };
        this.mutatePhoto(photo, test, action, callback);
    }
    mutatePhoto(photo, test, action, callback) {
        if (!photo.key) return callback('Missing photo key');
        gapis.datastore.lookup([photo.key], (err, result) => {
            this.permissionTest(err, result, test, (err) => {
                if (err) return callback(err);
                action(photo, result.found[0].entity, callback);
            });
        });
    }

    update(photo, test, callback) {
        let action = (photo, serverPhotoProto, callback) => {
            let serverPhoto = Util.fromProtoEntity(serverPhotoProto.properties);
            _.assign(serverPhoto, photo);
            Util.toProtoEntity(serverPhotoProto.properties, photo, true);
            gapis.datastore.upsert([serverPhotoProto], callback);
        }
        this.mutatePhoto(photo, test, action, callback);
    }

    fetchAll(placeid, callback) {
        let gql = 'SELECT * WHERE __key__ HAS ANCESTOR Key(' + BUSINESS_KEY + ',"' + placeid + '", ' + MEDIA_FILE_KIND + ',"' + MEDIA_PREFIX + placeid + '")';
        gapis.datastore.runGQLQuery(gql, (err, results) => {
            if (err) return callback(err);
            let photos = Util.fromProtoEntities(results.batch.entityResults, true);
            let retval = this.sortPhotosByUserType(photos);
            callback(null, retval);
        });
    }


    siftThrough(entities, callback) {
        let photosEntities = app.business.filterEntitiesFor(entities, MEDIA_FILE_KIND, 1);
        let photos = Util.fromProtoEntities(photosEntities, true);

        let retval = this.sortPhotosByUserType(photos);
        callback(null, retval);
    }

    private sortPhotosByUserType(photos) {
        return {
            pos: {
                photoLinks: _.filter(photos, (photo) => {
                    return photo.route == POS_USER_ROUTE;
                })
            },
            client: {
                photoLinks: _.filter(photos, (photo) => {
                    return photo.route == CLIENT_USER_ROUTE;
                })
            }
        }
    }
    private constructKey(params) {
        return {
            path: [{ kind: BUSINESS_KEY, name: params.placeid },
                { kind: MEDIA_FILE_KIND, name: MEDIA_PREFIX + params.placeid },
                { kind: params.kind }]
        };
    }
    private constructEntry(params) {
        params.type = params.type || Util.extractExtension(params.image);

        let key = this.constructKey(params);
        let properties = {};
        Util.toProtoEntity(properties, params);
        Util.filter(properties);
        return {
            key: key, properties: properties
        };
    }

    private getKindName(kind) {
        switch (kind) {
            case MEDIA_KIND.Photo:
                return PHOTO_FILE_KIND;
        }
    }
}