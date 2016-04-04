var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_1 = require('../../../public/app.common/modules/module');
var utils_1 = require('../../../public/app.common/modules/utils');
var MAX_ITERATIONS = 10;
var BusinessModule = (function (_super) {
    __extends(BusinessModule, _super);
    function BusinessModule() {
        _super.apply(this, arguments);
    }
    BusinessModule.prototype.name = function () { return 'Business'; };
    BusinessModule.prototype.init = function () {
        this.businesses = {};
    };
    BusinessModule.prototype.processBusiness = function (business) {
        var locals = {};
        if (localStorage && localStorage[business.placeid])
            locals = JSON.parse(localStorage[business.placeid]);
        locals.route = '/businesses/' + business.placeid;
        var defaultLocals = this.getDefaultLocals();
        business.locals = _.merge(defaultLocals, locals);
        if (this.businesses[business.placeid])
            _.merge(this.businesses[business.placeid], business);
    };
    BusinessModule.prototype.onFetchReceived = function (business) {
        _super.prototype.onFetchReceived.call(this, business);
        this.processBusiness(business);
        this.businesses[business.placeid] = business;
        console.log('Business received');
        PubSub.publish('Business.received', business);
    };
    BusinessModule.prototype.onFetchEnd = function (business) {
        _super.prototype.onFetchEnd.call(this, business);
        console.log('Business receive end');
        PubSub.publish('Business.fetch.end', business);
    };
    BusinessModule.prototype.isReady = function (params) {
        if (params === void 0) { params = {}; }
        console.log('checking if placeid ' + params.placeid + ' is ready...');
        if (!params.placeid)
            return this.ready;
        return !!this.businesses[params.placeid];
    };
    BusinessModule.prototype.hasData = function () {
        return !!Object.keys(this.businesses).length;
    };
    BusinessModule.prototype.getLocation = function (callback) {
        var _this = this;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                _this.location = new Object();
                _this.location.lat = position.coords.latitude;
                _this.location.lon = position.coords.longitude;
                _this.location.accuracy = position.coords.accuracy;
                callback(null, _this.location);
            }, function (err) {
                callback(err);
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 1000 * 30
            });
        }
        else
            callback('Geolocation not supported');
    };
    BusinessModule.prototype.set = function (business, params) {
        this.businesses[business.placeid].locals = _.merge({}, this.businesses[business.placeid].locals, params);
        this.save();
        PubSub.publish('Locals.change', business.placeid);
    };
    BusinessModule.prototype.get = function (placeid /*, callback, iterationNo*/) {
        /*
        if (!iterationNo) iterationNo = 0;
        else if (iterationNo > MAX_ITERATIONS) return callback('Operation timed out');

        if (!this.businesses[placeid])
            return setTimeout(this.get.bind(this), 1000, placeid, callback, iterationNo++);
        callback(null, this.businesses[placeid]);
        */
        return this.businesses[placeid];
    };
    BusinessModule.prototype.getAll = function () { return _.values(this.businesses); };
    BusinessModule.prototype.clearPreviousData = function () {
        //TODO: somehow clear previous but keep locals...
    };
    ////////////////// aux computational functions ///////////////
    BusinessModule.prototype.setupMissingFieldsInFloormap = function (floormap) {
        _.forEach(floormap.layers, function (layer) {
            layer.center = utils_1.Utils.getCenterOfCoords(layer.coords);
            layer.number = /\d+/.exec(layer.name)[0];
            layer.hide = true;
        });
    };
    BusinessModule.prototype.recalcCenter = function (coords) {
        return utils_1.Utils.getCenterOfCoords(coords);
    };
    return BusinessModule;
})(module_1.Module);
exports.BusinessModule = BusinessModule;
//# sourceMappingURL=business-module.js.map