var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var gapis;
var NOT_READY = 'Datastore is not ready yet';
var Datastore = (function () {
    function Datastore(gapisInstance) {
        this.counter = 0;
        this.businessList = null;
        gapis = gapisInstance;
        this.datasetId = gapis.projectId;
        this.dataset = gapis.gcloud.datastore.dataset();
        this.advanced = gapis.googleapis.datastore({
            version: 'v1beta2',
            auth: gapis.credentials,
            projectId: gapis.projectId,
            params: { datasetId: gapis.projectId }
        }).datasets;
        app_1.logging.info('Datastore configured');
        this.ready = true;
        PubSub.publish('Datastore.ready', this.ready);
    }
    Datastore.prototype.constructEntity = function (key, data) {
        var time = (new Date()).toISOString();
        var properties = {
            time: { dateTimeValue: time },
        };
        utils_1.Util.toProtoEntity(properties, data, true);
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    //--------------- FINALLY MY OWN CORE LIBRARY -----------
    Datastore.prototype.runGQLQuery = function (gqlQuery, callback, tx) {
        if (!this.ready)
            return this.waitTillReady(this.runGQLQuery, gqlQuery, callback, tx);
        var resource = {
            gqlQuery: {
                queryString: gqlQuery,
                allowLiteral: true
            }
        };
        if (tx)
            resource.transaction = tx;
        this.advanced.runQuery({
            datasetId: this.datasetId,
            resource: resource
        }, callback);
    };
    Datastore.prototype.mutate = function (entities, mutation, callback, tx) {
        if (!this.ready)
            return this.waitTillReady(this.mutate, entities, mutation, callback, tx);
        var resource = { mutation: {} };
        resource.mutation[mutation] = entities;
        if (tx)
            resource.transaction = tx;
        else
            resource.mode = 'NON_TRANSACTIONAL';
        this.advanced.commit({
            datasetId: this.datasetId,
            resource: resource
        }, callback);
    };
    Datastore.prototype.insert = function (entities, callback, tx) {
        this.mutate(entities, 'insert', callback, tx);
    };
    Datastore.prototype.update = function (entities, callback, tx) {
        this.mutate(entities, 'update', callback, tx);
    };
    Datastore.prototype.upsert = function (entities, callback, tx) {
        this.mutate(entities, 'upsert', callback, tx);
    };
    Datastore.prototype.delete = function (keys, callback, tx) {
        if (!this.ready)
            return this.waitTillReady(this.delete, keys, callback, tx);
        var resource = {
            mutation: {
                delete: keys
            }
        };
        if (tx)
            resource.transaction = tx;
        else
            resource.mode = 'NON_TRANSACTIONAL';
        this.advanced.commit({
            datasetId: this.datasetId,
            resource: resource
        }, callback);
    };
    Datastore.prototype.startTransaction = function (func, callback) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (!this.ready)
            return this.waitTillReady.apply(this, [this.startTransaction, callback].concat(args));
        return func.apply(void 0, [callback, null].concat(args));
        this.advanced.beginTransaction({
            datasetId: this.datasetId
        }, function (err, result) {
            if (err)
                return callback(err);
            var tx = result.transaction;
            var entities = args.shift();
            func.apply(void 0, [entities, callback, tx].concat(args));
        });
    };
    Datastore.prototype.lookup = function (keys, callback, tx) {
        if (!this.ready)
            return this.waitTillReady(this.lookup, keys, callback, tx);
        var resource = {
            keys: keys
        };
        if (tx)
            resource.readOptions = {
                transaction: tx,
            };
        this.advanced.lookup({
            datasetId: this.datasetId,
            resource: resource
        }, callback);
    };
    Datastore.prototype.insertAutoId = function (entities, callback, tx) {
        if (!this.ready)
            return this.waitTillReady(this.insertAutoId, entities, callback, tx);
        var resource = {
            mutation: {
                insertAutoId: entities
            }
        };
        if (tx)
            resource.transaction = tx;
        else
            resource.mode = 'NON_TRANSACTIONAL';
        this.advanced.commit({
            datasetId: this.datasetId,
            resource: resource
        }, callback);
    };
    Datastore.prototype.waitTillReady = function (func) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.ready)
            return func.apply(args);
        setTimeout.apply(void 0, [this.waitTillReady.bind(this), 300].concat(args));
    };
    return Datastore;
})();
exports.Datastore = Datastore;
//# sourceMappingURL=datastore.js.map