import {logging, gapis, app} from '../../app';
import {Util} from '../service/utils';
import {BUSINESS_KEY, GOOGLE_INFO_KEY, LOCATION_KEY} from '../business/business';
import PubSub = require('pubsub-js');

//https://github.com/danieldkim/geomodel
var Geomodel = require('geomodel').create_geomodel();
var async = require('async');
var _ = require('lodash');
var fs = require('fs');

export const MAX_RADIUS = 5000; //for app users
export const MAX_RESULT_COUNT_PER_ITERATION = 10;
export const MAX_RESULT_COUNT = 100;
export const BUSINESS_LIST_QUERY_INTERVAL = 1000 * 60 * 60 * 24; // TODO: change to a larger interval in production
export const RELEVANT_TYPES = ['restaurant', 'cafe'];
const ALL_RADIUS = 0;
const ALL_RESULTS = 0;
const MAX_DISTANCE_FOR_ON_LOCATION_TAG = 50; //meters
const LOCAL_DB_FILENAME = 'business_locations.db';
export class Geolocation {
    private businessList = null;
    private nonCafeBusinessList = null;
    private hash;

    constructor() {
        this.loadBusinessLocationList();
    }

    public ready() {
        return !!this.businessList;
    }
    public getAllPlaceIds(callback) {
        if (!this.ready())
            return setTimeout(this.getAllPlaceIds.bind(this), 1000);
        callback(null, _.map(this.businessList, (b) => {
            return b.placeid.stringValue;
        }));
    }
    // ------------ OWNERS -----------------------
    getLocationsFor(placeids, location, callback):any {
        if (!this.ready())
            return setTimeout(this.getLocationsFor.bind(this), 1000, placeids, location, callback);
        var locations = _.map(placeids, (placeid) => {
            let result = _.find(this.businessList, (b) => {
                return b.placeid.stringValue == placeid;
            });
            if (!result)
                result = _.find(this.nonCafeBusinessList, (b) => {
                    return b.placeid.stringValue == placeid;
                });
            return result;
        });
        let mid_callback = (err, results?) => {
            if (err) return callback(null, formatLocations());
            if (!results.length) return callback(null, formatLocations());
            if (results[0][1] < MAX_DISTANCE_FOR_ON_LOCATION_TAG)
                results[0][0].onLocation = true;
            callback(null, results);
        }
        if (location)
            return this.getRecordsByRadius(locations, location.lat, location.lon, ALL_RADIUS, ALL_RESULTS, mid_callback);
        else
            return mid_callback('No location provided');

        function formatLocations() {
            return _.map(locations, (location) => {
                return [location];
            });
        }
    }
    // ------------ CLIENT -----------------------
    createGeoModelPropertiesForDatastore(lat, lon) {
        var location = Geomodel.create_point(lat, lon);
        return { location: location, geocells: Geomodel.generate_geocells(location) };
    }
    private sanitize(search) {
        search.location.radius = search.radius || Number.MAX_VALUE;
        search.location.radius = Math.min(search.radius, MAX_RADIUS);

        //The idea is to return maxium of 50 results considering the drawback in having to run through the entire gamut in geomodel
        search.count = search.count || MAX_RESULT_COUNT_PER_ITERATION;
        if (search.iteration) {
            search.count *= search.iteration;
            search.count += MAX_RESULT_COUNT_PER_ITERATION;
        }

        search.count = Math.min(search.count, MAX_RESULT_COUNT);
    }
    searchNearBy(search, yield_callback: (item) => any, err_callback: (err) => any) {
        this.sanitize(search);
        console.time('Searching for nearby businesses...');
        async.waterfall([
            (callback) => {
                this.getRecordsByRadius(this.businessList, search.location.lat, search.location.lon, search.location.radius, search.count, callback);
            },
            (results, callback) => {
                results = this.siftThroughPreviousResults(search.placeids, results) || results;
                app.business.fetchMatchingEntities(results, yield_callback, callback, search);
            }]
            , function (err) {
                console.time('Searching for nearby businesses...');
                err_callback(err);
            }.bind(this));
    }
    getRecordsByRadius(recordList, lat, lon, radius, maxResultCount, callback) {
        var location = Geomodel.create_point(lat, lon);

        Geomodel.proximity_fetch(location, maxResultCount, radius,
            (geocells, finder_callback) => {
                var results = _.reject(recordList, function (x) {
                    return (_.intersection(x.geocells, geocells).length < 1);
                })
                finder_callback(null, results);
            }, callback);

    }
    private siftThroughPreviousResults(previousResultsPlaceId, results) {
        if (!previousResultsPlaceId)
            return undefined;
        return _.filter(results, (result) => {
            return !_.includes(previousResultsPlaceId, result[0].placeid.stringValue);
        });
    }

    // ------------ POLLING FOR NEW DATA FROM DB -------
    private pollDatastoreForBusinessList() {
        if (!gapis.datastore)
            return setTimeout(this.pollDatastoreForBusinessList.bind(this), 1000);
        this.pollDatastoreForBusinessListAux();
        // TODO: somehow we must poll even tho it's a lot of money
        //setInterval(this.pollDatastoreForBusinessListAux, BUSINESS_LIST_QUERY_INTERVAL);
    }
    private pollDatastoreForBusinessListAux() {
        async.waterfall([
            (callback) => {
                this.getAllRelevantBusinesses(RELEVANT_TYPES, callback);
            },
            (relevantList, callback) => {
                this.retrieveLocations(relevantList, callback);
            }], (err, businessList, nonCafeBusinessList) => {
                if (!err) {
                    let data = {
                        businessList: businessList,
                        nonCafeBusinessList: nonCafeBusinessList
                    } as any;
                    this.businessList = businessList;
                    this.nonCafeBusinessList = nonCafeBusinessList;
                    data.hash = this.hash = Util.hash(data);
                    this.writeToFile(data);
                    logging.info('Successfully polled db for list of businesses');
                }
                else
                    logging.error(err);
            });
    }
    private parseGeocellsJson(data) {
        data.geocells = data.geocells.listValue.map((geocell) => {
            return geocell.stringValue;
        });
        data.location = { lat: data.location.listValue[0].doubleValue, lon: data.location.listValue[1].doubleValue };
        data.id = data.placeid;
        return data;
    }
    private retrieveLocations(relevantList, callback) {
        let gql = "SELECT * FROM " + LOCATION_KEY;

        gapis.datastore.runGQLQuery(gql, (err, results) => {
            if (!err) {
                let entities = results.batch.entityResults;
                let businessList = [];
                let nonCafeBusinessList = [];
                _.forEach(entities, (entity) => {
                    entity = entity.entity;
                    let placeid = entity.key.path[0].name;
                    let index = relevantList.indexOf('g' + placeid);
                    if (index > -1)
                        businessList.push(this.parseGeocellsJson(entity.properties));
                    else
                        nonCafeBusinessList.push(this.parseGeocellsJson(entity.properties));
                });
                callback(null, businessList, nonCafeBusinessList);
            }
            else
                callback(err);
        });
    }
    private getAllRelevantBusinesses(relevantTypes, final_callback) {
        var placeids = [];
        var errors = [];
        var q = async.queue((gql, callback) => {
            gapis.datastore.runGQLQuery(gql, (err, results) => {
                if (err)
                    return callback(err);
                // TODO: check for more results if necessary
                callback(null,
                    results.batch.entityResults.map((result) => {
                        return result.entity.key.path[1].name;
                    }));
            });
        });

        q.drain = () => {
            let err = errors.length < 1 ? null : errors;
            final_callback(err, placeids);
        }

        relevantTypes.forEach((type) => {
            let gql = "SELECT __key__ FROM " + GOOGLE_INFO_KEY + " WHERE types = '" + type + "'";
            q.push(gql, function (err, type_placeids) {
                if (err)
                    errors.push(err);
                else
                    placeids = _.uniq(placeids.concat(type_placeids));
            });
        });
    }
    //////////////// CREATE LOCAL DB //////////////////
    writeToFile(data) {
        data = JSON.stringify(data);
        fs.writeFile(LOCAL_DB_FILENAME, data, (err) => { if (err) logging.error('Error saving locations to local file: ', err) });
    }

    readFromFile(callback) {
        fs.readFile(LOCAL_DB_FILENAME, callback);
    }

    loadBusinessLocationList() {
        this.readFromFile((err, data) => {
            try {
                if (data) data = JSON.parse(data);
            } catch (e) {
                data = {};
            }
            if (err || this.isDataCorrupt(data))
                return this.pollDatastoreForBusinessList();

            this.businessList = data.businessList;
            logging.info('Found ' + this.businessList.length + ' cafe-like businesses');
            this.nonCafeBusinessList = data.nonCafeBusinessList;
            logging.info('Found ' + this.nonCafeBusinessList.length + ' noncafe businesses');

            logging.info('Successfully loaded local db file');
        });
    }

    isDataCorrupt(data) {
        let corrupt = !data.businessList || !data.nonCafeBusinessList
            || !data.businessList.length || !data.nonCafeBusinessList.length
            || data.hash != Util.hash(data);
        if (corrupt)
            logging.info('Local business locations db file is corrupt');
        return corrupt;
    }
}
    