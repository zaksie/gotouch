import {logging, config} from '../../app';
import {Util} from '../service/utils';
import PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');
var gapis;
const NOT_READY = 'Datastore is not ready yet';
export class Datastore {
    public dataset;
    public advanced;
    counter = 0;
    datasetId;
    businessList = null;
    ready;
    constructor(gapisInstance) {
        gapis = gapisInstance;
        this.datasetId = gapis.projectId;
        this.dataset = gapis.gcloud.datastore.dataset();
        this.advanced = gapis.googleapis.datastore({
            version: 'v1beta2',
            auth: gapis.credentials,
            projectId: gapis.projectId,
            params: { datasetId: gapis.projectId }
        }).datasets;
        logging.info('Datastore configured');
        this.ready = true;
        PubSub.publish('Datastore.ready', this.ready);
    }

    constructEntity(key, data) {
        let time = (new Date()).toISOString();
        let properties = {
            time: { dateTimeValue: time },
        };
        Util.toProtoEntity(properties, data, true);
        Util.filter(properties);

        return { key: key, properties: properties };
    }
    //--------------- FINALLY MY OWN CORE LIBRARY -----------
    runGQLQuery(gqlQuery, callback, tx?) {
        if (!this.ready) return this.waitTillReady(this.runGQLQuery, gqlQuery, callback, tx);

        var resource = {
            gqlQuery: {
                queryString: gqlQuery,
                allowLiteral: true
            }
        };
        if (tx)
            (resource as any).transaction = tx;

        this.advanced.runQuery({
            datasetId: this.datasetId,
            resource: resource
        }, callback);
    }

    private mutate(entities, mutation, callback, tx) {
        if (!this.ready) return this.waitTillReady(this.mutate, entities, mutation, callback, tx);

        var resource = { mutation: {}} as any;
        resource.mutation[mutation] = entities;
        if (tx)
            resource.transaction = tx;
        else
            resource.mode = 'NON_TRANSACTIONAL';
   
        this.advanced.commit({
            datasetId: this.datasetId,
            resource: resource
        }, callback)
    }

    insert(entities, callback, tx) {
        this.mutate(entities, 'insert', callback, tx);
    }


    update(entities, callback, tx) {
        this.mutate(entities, 'update', callback, tx);
    }

    upsert(entities, callback, tx) {
        this.mutate(entities, 'upsert', callback, tx);
    }

    delete(keys, callback, tx) {
        if (!this.ready) return this.waitTillReady(this.delete, keys, callback, tx);

        var resource = {
            mutation: {
                delete: keys
            }
        } as any;
        if (tx)
            resource.transaction = tx;
        else
            resource.mode = 'NON_TRANSACTIONAL';

        this.advanced.commit({
            datasetId: this.datasetId,
            resource: resource
        }, callback)
    }

    startTransaction(func, callback, ...args) {
        if (!this.ready) return this.waitTillReady(this.startTransaction, callback, ...args);

        return func(callback, null, ...args);

        this.advanced.beginTransaction({
            datasetId: this.datasetId
        }, (err, result) => {
            if (err) return callback(err);
            var tx = result.transaction;
            let entities = args.shift();
            func(entities, callback, tx, ...args);
        });
    }


    lookup(keys, callback, tx?) {
        if (!this.ready) return this.waitTillReady(this.lookup, keys, callback, tx);
        var resource = {
            keys: keys
        } as any;
        if (tx)
            resource.readOptions = {
                transaction: tx,
            };

        this.advanced.lookup({
            datasetId: this.datasetId,
            resource: resource
        }, callback)
    }

    insertAutoId(entities, callback, tx) {
        if (!this.ready) return this.waitTillReady(this.insertAutoId, entities, callback, tx);

        var resource = {
            mutation: {
                insertAutoId: entities
            }
        } as any;
        if (tx)
            resource.transaction = tx;
        else
            resource.mode = 'NON_TRANSACTIONAL';

        this.advanced.commit({
            datasetId: this.datasetId,
            resource: resource
        }, callback)
    }

    waitTillReady(func, ...args) {
        if (this.ready) return func.apply(args);

        setTimeout(this.waitTillReady.bind(this), 300, ...args); 
    }
}