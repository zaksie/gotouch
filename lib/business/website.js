var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
exports.WEBSITE_KEY = 'Website';
var Website = (function () {
    function Website(websiteDocumentInstances) {
        this.websiteDocumentInstances = websiteDocumentInstances;
        PubSub.subscribe('Datastore.ready', function () {
        });
    }
    Website.prototype.getDocuments = function (website, partial, final_callback) {
        var results = {};
        var q = async.queue(function (params, callback) {
            params.instance.getDocuments(website, params.partial, function (err, documents) {
                callback(null, _.map(documents, function (doc) {
                    return {
                        type: doc.type,
                        title: doc.title,
                        path: doc.path,
                        thumbnail: doc.thumbnail,
                        tags: doc.tags
                    };
                }));
            });
        });
        q.drain = function () {
            end();
        };
        this.websiteDocumentInstances.forEach(function (instance) {
            q.push({ instance: instance, partial: partial }, function (err, result) {
                if (err)
                    app_1.logging.error(err);
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
        var end = function () {
            final_callback(null, results);
        };
    };
    Website.prototype.getJustPhotosLinks = function (website, callback) {
        var mid_callback = function (err, result) {
            var properties = {};
            if (!err) {
                if (!result)
                    return callback('Website not found: ' + website);
                properties = utils_1.Util.fromProtoEntity(result.batch.entityResults[0].entity.properties);
                //if no image or thumbnail then null is inserted into an empty or populated list and thus giving an eventual null result.
                properties.ImageDocument = properties.ImageDocument || [null];
                if (properties.thumbnail || properties.image)
                    properties.ImageDocument.splice(0, 0, properties.thumbnail || properties.image);
            }
            callback(err, properties.ImageDocument);
        };
        var gql = 'SELECT * FROM ' + exports.WEBSITE_KEY + ' WHERE __key__ = Key(' + exports.WEBSITE_KEY + ',"' + website + '")';
        app_1.gapis.datastore.runGQLQuery(gql, mid_callback);
    };
    Website.prototype.constructKey = function (website) {
        return {
            path: [{ kind: exports.WEBSITE_KEY, name: website }]
        };
    };
    return Website;
})();
exports.Website = Website;
var WebsiteDocument = (function () {
    function WebsiteDocument() {
        this.MAX_LENGTH_FOR_TAG = 20;
    }
    WebsiteDocument.prototype.getDocuments = function (website, partial, callback) {
        var _this = this;
        var mid_callback = function (err, result) {
            if (err)
                return callback(err);
            if (!result.batch.entityResults.length)
                return callback(null, null);
            //let docs = Util.fromProtoEntities(result.batch.entityResults, true);
            var docs = [];
            var updateList = [];
            _.forEach(result.batch.entityResults, function (docProto) {
                docProto = docProto.entity;
                var doc = utils_1.Util.fromProtoEntity(docProto.properties);
                if (partial && doc.type == 'PDF')
                    return; // continue
                docs.push(doc);
                var change = !_this.setTags(doc);
                change = change || !_this.setText(doc);
                if (change) {
                    utils_1.Util.toProtoEntity(docProto.properties, { tags: doc.tags });
                    utils_1.Util.filter(docProto.properties);
                    updateList.push(docProto);
                }
                if (partial)
                    return false; // break
            });
            if (updateList)
                app_1.gapis.datastore.upsert(updateList, function (err) {
                    if (err)
                        app_1.logging.error(err);
                });
            callback(null, docs);
        };
        var gql = 'SELECT * FROM ' + this.getKeyName() + ' WHERE __key__ HAS ANCESTOR Key(' + exports.WEBSITE_KEY + ',"' + website + '")';
        if (partial)
            gql += ' LIMIT 20';
        app_1.gapis.datastore.runGQLQuery(gql, mid_callback, null);
    };
    WebsiteDocument.prototype.setTags = function (doc) {
        var _this = this;
        if (!doc.tags) {
            var tags = doc.snippet.split(/[,|.|-]+/);
            doc.tags = _.map(tags, function (tag) {
                return tag.trim();
            });
            doc.tags = _.filter(doc.tags, function (t) {
                return t && !t.match(/\d+/) && t.length < _this.MAX_LENGTH_FOR_TAG && !_.includes(t, '/');
            });
            return !doc.tags.length; // true means dont add back to datastore
        }
        return true;
    };
    WebsiteDocument.prototype.setText = function (doc) {
        if (!doc.text)
            doc.text = doc.title && !doc.title.match(/\d+/) ? doc.title : '';
        return doc.text;
    };
    return WebsiteDocument;
})();
exports.WebsiteDocument = WebsiteDocument;
//# sourceMappingURL=website.js.map