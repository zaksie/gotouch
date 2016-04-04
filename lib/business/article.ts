import {logging, gapis, config, client, duid, app} from '../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../service/utils';
import {BUSINESS_KEY} from './business';
import PubSub = require('pubsub-js');

var async = require('async');
var _ = require('lodash');
var articleList = require('../../public/article-list.json');

export const ARTICLE_KEY = 'Article';

export class Article {
    constructor() {
        PubSub.subscribe('Datastore.ready', () => {
        });
    }

    fetchAll(placeid, callback) {
        var gqlQuery = "SELECT * FROM " + ARTICLE_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + BUSINESS_KEY + ", '" + placeid + "')";
        gapis.datastore.runGQLQuery(gqlQuery, (err, results) => {
            if (err) return callback(err);
            if (!results.batch.entityResults.length) return callback();

            let articles = Util.fromProtoEntities(results.batch.entityResults);

            callback(null, articles);
        });
    }

    fetchArticle(placeid, pid, callback) {
        var keys = [{
            path: [{ kind: BUSINESS_KEY, name: placeid },
                { kind: ARTICLE_KEY, name: pid }]
        }];
        gapis.datastore.lookup(keys, (err, results) => {
            if (!err && results.found.length)
                var article = Util.fromProtoEntity(results.found[0].entity.properties);
            callback(err, article);
        });
    }

    fetchMultipleArticles(placeid, pids, final_callback) {
        pids = _.uniq(pids);
        var results = {};
        var errors = [];
        var q = async.queue((pid, callback) => {
            this.fetchArticle(placeid, pid, callback);
        });

        q.drain = () => {
            let err = errors.length < 1 ? null : errors;
            final_callback(err, results);
        }

        pids.forEach((pid) => {
            q.push(pid, (err, result) => {
                if (err)
                    errors.push(err);
                else {
                    results[pid] = result;
                }
            });
        });
    }

    siftThrough(entities, callback) {
        let articleEntities = app.business.filterEntitiesFor(entities, ARTICLE_KEY);
        let articles = Util.fromProtoEntities(articleEntities, true);

        callback(null, articles);
    }
    ////////////////// CREATING ARTICLES FROM JSON ///////////////////
    private constructArticles(json) {
        let placeid = json.placeid;
        let time = new Date().toISOString();
        var articles = [];
        _.forEach(json.articles, (article) => {

            let path = [{ kind: BUSINESS_KEY, name: placeid },
                { kind: ARTICLE_KEY, name: article.pid }];
            let key = {
                path: path,
            };

            let properties = {
                placeid: { stringValue: placeid },
                time: { dateTimeValue: time },
                complete: { booleanValue: true }
            };

            Util.toProtoEntity(properties, article);
            Util.filter(properties);

            let entity = { key: key, properties: properties };
            articles.push(entity);
        });
        return articles;
    }

}


