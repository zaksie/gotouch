import {logging, gapis, config, duid, app} from '../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../service/utils';
import {BUSINESS_KEY} from './business';
import PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
export const WEBSITE_KEY = 'Website';

export class Website {
    websiteDocumentInstances;
    constructor(websiteDocumentInstances: Array<WebsiteDocument>) {
        this.websiteDocumentInstances = websiteDocumentInstances;
        PubSub.subscribe('Datastore.ready', () => {
        });
    }


    getDocuments(website, partial, final_callback) {
        let results = {} as any;
        var q = async.queue((params, callback) => {
            params.instance.getDocuments(website, params.partial, (err, documents) => {
                callback(null, _.map(documents, (doc) => {
                    return {
                        type: doc.type,
                        title: doc.title,
                        path: doc.path,
                        thumbnail: doc.thumbnail,
                        tags: doc.tags 
                    }
                }));
            });
        });

        q.drain = () => {
            end();
        }

        this.websiteDocumentInstances.forEach((instance) => {
            q.push({ instance: instance, partial: partial }, (err, result) => {
                if (err)
                    logging.error(err);
                else if (result.length) {
                    if (result[0].type == 'PDF')
                        results.pdf = (results.pdf || []).concat(result);
                    else
                        results.photos = (results.photos || []).concat(result);
                    if (partial) {
                        q.kill();
                        end();
                    }
                }
            });
        });

        var end = () => {
            final_callback(null, results);
        };
    }

    getJustPhotosLinks(website, callback) {
        var mid_callback = (err, result) => {
            var properties = {} as any;
            if (!err) {
                if (!result) return callback('Website not found: ' + website);
                properties = Util.fromProtoEntity(result.batch.entityResults[0].entity.properties);
                
                //if no image or thumbnail then null is inserted into an empty or populated list and thus giving an eventual null result.
                properties.ImageDocument = properties.ImageDocument || [null];

                if (properties.thumbnail || properties.image)
                    properties.ImageDocument.splice(0, 0, properties.thumbnail || properties.image); 
            }

            callback(err, properties.ImageDocument);
        }

        let gql = 'SELECT * FROM ' + WEBSITE_KEY + ' WHERE __key__ = Key(' + WEBSITE_KEY + ',"' + website + '")';
        gapis.datastore.runGQLQuery(gql, mid_callback);
    }

    private constructKey(website){
        return {
            path: [{ kind: WEBSITE_KEY, name: website }]
        };
    }
}

export abstract class WebsiteDocument {
    MAX_LENGTH_FOR_TAG = 20;
    abstract getKeyName(): string;
    getDocuments(website, partial, callback) {
        var mid_callback = (err, result) => {
            if (err) return callback(err);
            if (!result.batch.entityResults.length) return callback(null, null);
            //let docs = Util.fromProtoEntities(result.batch.entityResults, true);
            let docs = [];
            let updateList = [];
            _.forEach(result.batch.entityResults, (docProto) => {
                docProto = docProto.entity;
                let doc = Util.fromProtoEntity(docProto.properties);

                if (partial && doc.type == 'PDF') return; // continue

                docs.push(doc);
                let change = !this.setTags(doc);
                change = change || !this.setText(doc);

                if (change) {
                    Util.toProtoEntity(docProto.properties, { tags: doc.tags });
                    Util.filter(docProto.properties);
                    updateList.push(docProto);
                }

                if (partial) return false; // break
            });
            if (updateList)
                gapis.datastore.upsert(updateList, (err) => {
                    if (err)
                        logging.error(err);
                });

            callback(null, docs);
        }
        var gql = 'SELECT * FROM ' + this.getKeyName() + ' WHERE __key__ HAS ANCESTOR Key(' + WEBSITE_KEY + ',"' + website + '")';
        if (partial)
            gql += ' LIMIT 20';
        gapis.datastore.runGQLQuery(gql, mid_callback, null);
    }

    setTags(doc) {
        if (!doc.tags) {
            let tags = doc.snippet.split(/[,|.|-]+/);
            doc.tags = _.map(tags, (tag) => {
                return tag.trim();
            });
            doc.tags = _.filter(doc.tags, (t) => {
                return t && !t.match(/\d+/) && t.length < this.MAX_LENGTH_FOR_TAG && !_.includes(t, '/');
            });
            return !doc.tags.length; // true means dont add back to datastore
        }
        return true;
    }

    setText(doc) {
        if (!doc.text)
            doc.text = doc.title && !doc.title.match(/\d+/) ? doc.title : '';
        return doc.text;
    }
}