var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var business_1 = require('./business');
var PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var articleList = require('../../public/article-list.json');
exports.ARTICLE_KEY = 'Article';
var Article = (function () {
    function Article() {
        PubSub.subscribe('Datastore.ready', function () {
        });
    }
    Article.prototype.fetchAll = function (placeid, callback) {
        var gqlQuery = "SELECT * FROM " + exports.ARTICLE_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + business_1.BUSINESS_KEY + ", '" + placeid + "')";
        app_1.gapis.datastore.runGQLQuery(gqlQuery, function (err, results) {
            if (err)
                return callback(err);
            if (!results.batch.entityResults.length)
                return callback();
            var articles = utils_1.Util.fromProtoEntities(results.batch.entityResults);
            callback(null, articles);
        });
    };
    Article.prototype.fetchArticle = function (placeid, pid, callback) {
        var keys = [{
                path: [{ kind: business_1.BUSINESS_KEY, name: placeid },
                    { kind: exports.ARTICLE_KEY, name: pid }]
            }];
        app_1.gapis.datastore.lookup(keys, function (err, results) {
            if (!err && results.found.length)
                var article = utils_1.Util.fromProtoEntity(results.found[0].entity.properties);
            callback(err, article);
        });
    };
    Article.prototype.fetchMultipleArticles = function (placeid, pids, final_callback) {
        var _this = this;
        pids = _.uniq(pids);
        var results = {};
        var errors = [];
        var q = async.queue(function (pid, callback) {
            _this.fetchArticle(placeid, pid, callback);
        });
        q.drain = function () {
            var err = errors.length < 1 ? null : errors;
            final_callback(err, results);
        };
        pids.forEach(function (pid) {
            q.push(pid, function (err, result) {
                if (err)
                    errors.push(err);
                else {
                    results[pid] = result;
                }
            });
        });
    };
    Article.prototype.siftThrough = function (entities, callback) {
        var articleEntities = app_1.app.business.filterEntitiesFor(entities, exports.ARTICLE_KEY);
        var articles = utils_1.Util.fromProtoEntities(articleEntities, true);
        callback(null, articles);
    };
    ////////////////// CREATING ARTICLES FROM JSON ///////////////////
    Article.prototype.constructArticles = function (json) {
        var placeid = json.placeid;
        var time = new Date().toISOString();
        var articles = [];
        _.forEach(json.articles, function (article) {
            var path = [{ kind: business_1.BUSINESS_KEY, name: placeid },
                { kind: exports.ARTICLE_KEY, name: article.pid }];
            var key = {
                path: path,
            };
            var properties = {
                placeid: { stringValue: placeid },
                time: { dateTimeValue: time },
                complete: { booleanValue: true }
            };
            utils_1.Util.toProtoEntity(properties, article);
            utils_1.Util.filter(properties);
            var entity = { key: key, properties: properties };
            articles.push(entity);
        });
        return articles;
    };
    return Article;
})();
exports.Article = Article;
//# sourceMappingURL=article.js.map