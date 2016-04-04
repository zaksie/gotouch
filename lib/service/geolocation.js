var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var business_1 = require('../business/business');
//https://github.com/danieldkim/geomodel
var Geomodel = require('geomodel').create_geomodel();
var async = require('async');
var _ = require('lodash');
var fs = require('fs');
exports.MAX_RADIUS = 5000; //for app users
exports.MAX_RESULT_COUNT_PER_ITERATION = 10;
exports.MAX_RESULT_COUNT = 100;
exports.BUSINESS_LIST_QUERY_INTERVAL = 1000 * 60 * 60 * 24; // TODO: change to a larger interval in production
exports.RELEVANT_TYPES = ['restaurant', 'cafe'];
var ALL_RADIUS = 0;
var ALL_RESULTS = 0;
var MAX_DISTANCE_FOR_ON_LOCATION_TAG = 50; //meters
var LOCAL_DB_FILENAME = 'business_locations.db';
var Geolocation = (function () {
    function Geolocation() {
        this.businessList = null;
        this.nonCafeBusinessList = null;
        this.loadBusinessLocationList();
    }
    Geolocation.prototype.ready = function () {
        return !!this.businessList;
    };
    Geolocation.prototype.getAllPlaceIds = function (callback) {
        if (!this.ready())
            return setTimeout(this.getAllPlaceIds.bind(this), 1000);
        callback(null, _.map(this.businessList, function (b) {
            return b.placeid.stringValue;
        }));
    };
    // ------------ OWNERS -----------------------
    Geolocation.prototype.getLocationsFor = function (placeids, location, callback) {
        var _this = this;
        if (!this.ready())
            return setTimeout(this.getLocationsFor.bind(this), 1000, placeids, location, callback);
        var locations = _.map(placeids, function (placeid) {
            var result = _.find(_this.businessList, function (b) {
                return b.placeid.stringValue == placeid;
            });
            if (!result)
                result = _.find(_this.nonCafeBusinessList, function (b) {
                    return b.placeid.stringValue == placeid;
                });
            return result;
        });
        var mid_callback = function (err, results) {
            if (err)
                return callback(null, formatLocations());
            if (!results.length)
                return callback(null, formatLocations());
            if (results[0][1] < MAX_DISTANCE_FOR_ON_LOCATION_TAG)
                results[0][0].onLocation = true;
            callback(null, results);
        };
        if (location)
            return this.getRecordsByRadius(locations, location.lat, location.lon, ALL_RADIUS, ALL_RESULTS, mid_callback);
        else
            return mid_callback('No location provided');
        function formatLocations() {
            return _.map(locations, function (location) {
                return [location];
            });
        }
    };
    // ------------ CLIENT -----------------------
    Geolocation.prototype.createGeoModelPropertiesForDatastore = function (lat, lon) {
        var location = Geomodel.create_point(lat, lon);
        return { location: location, geocells: Geomodel.generate_geocells(location) };
    };
    Geolocation.prototype.sanitize = function (search) {
        search.location.radius = search.radius || Number.MAX_VALUE;
        search.location.radius = Math.min(search.radius, exports.MAX_RADIUS);
        //The idea is to return maxium of 50 results considering the drawback in having to run through the entire gamut in geomodel
        search.count = search.count || exports.MAX_RESULT_COUNT_PER_ITERATION;
        if (search.iteration) {
            search.count *= search.iteration;
            search.count += exports.MAX_RESULT_COUNT_PER_ITERATION;
        }
        search.count = Math.min(search.count, exports.MAX_RESULT_COUNT);
    };
    Geolocation.prototype.searchNearBy = function (search, yield_callback, err_callback) {
        var _this = this;
        this.sanitize(search);
        console.time('Searching for nearby businesses...');
        async.waterfall([
            function (callback) {
                _this.getRecordsByRadius(_this.businessList, search.location.lat, search.location.lon, search.location.radius, search.count, callback);
            },
            function (results, callback) {
                results = _this.siftThroughPreviousResults(search.placeids, results) || results;
                app_1.app.business.fetchMatchingEntities(results, yield_callback, callback, search);
            }], function (err) {
            console.time('Searching for nearby businesses...');
            err_callback(err);
        }.bind(this));
    };
    Geolocation.prototype.getRecordsByRadius = function (recordList, lat, lon, radius, maxResultCount, callback) {
        var location = Geomodel.create_point(lat, lon);
        Geomodel.proximity_fetch(location, maxResultCount, radius, function (geocells, finder_callback) {
            var results = _.reject(recordList, function (x) {
                return (_.intersection(x.geocells, geocells).length < 1);
            });
            finder_callback(null, results);
        }, callback);
    };
    Geolocation.prototype.siftThroughPreviousResults = function (previousResultsPlaceId, results) {
        if (!previousResultsPlaceId)
            return undefined;
        return _.filter(results, function (result) {
            return !_.includes(previousResultsPlaceId, result[0].placeid.stringValue);
        });
    };
    // ------------ POLLING FOR NEW DATA FROM DB -------
    Geolocation.prototype.pollDatastoreForBusinessList = function () {
        if (!app_1.gapis.datastore)
            return setTimeout(this.pollDatastoreForBusinessList.bind(this), 1000);
        this.pollDatastoreForBusinessListAux();
        // TODO: somehow we must poll even tho it's a lot of money
        //setInterval(this.pollDatastoreForBusinessListAux, BUSINESS_LIST_QUERY_INTERVAL);
    };
    Geolocation.prototype.pollDatastoreForBusinessListAux = function () {
        var _this = this;
        async.waterfall([
            function (callback) {
                _this.getAllRelevantBusinesses(exports.RELEVANT_TYPES, callback);
            },
            function (relevantList, callback) {
                _this.retrieveLocations(relevantList, callback);
            }], function (err, businessList, nonCafeBusinessList) {
            if (!err) {
                var data = {
                    businessList: businessList,
                    nonCafeBusinessList: nonCafeBusinessList
                };
                _this.businessList = businessList;
                _this.nonCafeBusinessList = nonCafeBusinessList;
                data.hash = _this.hash = utils_1.Util.hash(data);
                _this.writeToFile(data);
                app_1.logging.info('Successfully polled db for list of businesses');
            }
            else
                app_1.logging.error(err);
        });
    };
    Geolocation.prototype.parseGeocellsJson = function (data) {
        data.geocells = data.geocells.listValue.map(function (geocell) {
            return geocell.stringValue;
        });
        data.location = { lat: data.location.listValue[0].doubleValue, lon: data.location.listValue[1].doubleValue };
        data.id = data.placeid;
        return data;
    };
    Geolocation.prototype.retrieveLocations = function (relevantList, callback) {
        var _this = this;
        var gql = "SELECT * FROM " + business_1.LOCATION_KEY;
        app_1.gapis.datastore.runGQLQuery(gql, function (err, results) {
            if (!err) {
                var entities = results.batch.entityResults;
                var businessList = [];
                var nonCafeBusinessList = [];
                _.forEach(entities, function (entity) {
                    entity = entity.entity;
                    var placeid = entity.key.path[0].name;
                    var index = relevantList.indexOf('g' + placeid);
                    if (index > -1)
                        businessList.push(_this.parseGeocellsJson(entity.properties));
                    else
                        nonCafeBusinessList.push(_this.parseGeocellsJson(entity.properties));
                });
                callback(null, businessList, nonCafeBusinessList);
            }
            else
                callback(err);
        });
    };
    Geolocation.prototype.getAllRelevantBusinesses = function (relevantTypes, final_callback) {
        var placeids = [];
        var errors = [];
        var q = async.queue(function (gql, callback) {
            app_1.gapis.datastore.runGQLQuery(gql, function (err, results) {
                if (err)
                    return callback(err);
                // TODO: check for more results if necessary
                callback(null, results.batch.entityResults.map(function (result) {
                    return result.entity.key.path[1].name;
                }));
            });
        });
        q.drain = function () {
            var err = errors.length < 1 ? null : errors;
            final_callback(err, placeids);
        };
        relevantTypes.forEach(function (type) {
            var gql = "SELECT __key__ FROM " + business_1.GOOGLE_INFO_KEY + " WHERE types = '" + type + "'";
            q.push(gql, function (err, type_placeids) {
                if (err)
                    errors.push(err);
                else
                    placeids = _.uniq(placeids.concat(type_placeids));
            });
        });
    };
    //////////////// CREATE LOCAL DB //////////////////
    Geolocation.prototype.writeToFile = function (data) {
        data = JSON.stringify(data);
        fs.writeFile(LOCAL_DB_FILENAME, data, function (err) { if (err)
            app_1.logging.error('Error saving locations to local file: ', err); });
    };
    Geolocation.prototype.readFromFile = function (callback) {
        fs.readFile(LOCAL_DB_FILENAME, callback);
    };
    Geolocation.prototype.loadBusinessLocationList = function () {
        var _this = this;
        this.readFromFile(function (err, data) {
            try {
                if (data)
                    data = JSON.parse(data);
            }
            catch (e) {
                data = {};
            }
            if (err || _this.isDataCorrupt(data))
                return _this.pollDatastoreForBusinessList();
            _this.businessList = data.businessList;
            app_1.logging.info('Found ' + _this.businessList.length + ' cafe-like businesses');
            _this.nonCafeBusinessList = data.nonCafeBusinessList;
            app_1.logging.info('Found ' + _this.nonCafeBusinessList.length + ' noncafe businesses');
            app_1.logging.info('Successfully loaded local db file');
        });
    };
    Geolocation.prototype.isDataCorrupt = function (data) {
        var corrupt = !data.businessList || !data.nonCafeBusinessList
            || !data.businessList.length || !data.nonCafeBusinessList.length
            || data.hash != utils_1.Util.hash(data);
        if (corrupt)
            app_1.logging.info('Local business locations db file is corrupt');
        return corrupt;
    };
    return Geolocation;
})();
exports.Geolocation = Geolocation;
//# sourceMappingURL=geolocation.js.map