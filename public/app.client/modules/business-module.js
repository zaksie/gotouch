var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var business_module_1 = require('../../../public/app.common/modules/business-module');
var SHOW_MORE_COUNT = 10;
var ClientBusinessModule = (function (_super) {
    __extends(ClientBusinessModule, _super);
    function ClientBusinessModule() {
        var _this = this;
        _super.apply(this, arguments);
        this.current = {
            pending: '',
            placeid: '',
            get: function () { return _this.current.placeid ? _this.businesses[_this.current.placeid] : undefined; },
            set: function (placeid) {
                // this is used in the callback from the server with placeid = null
                if (!placeid && !_this.businesses[_this.current.pending])
                    return 'error';
                if (!placeid)
                    placeid = _this.current.pending;
                if (placeid == _this.current.placeid)
                    return;
                else {
                    _this.current.pending = placeid;
                    _this.current.placeid = '';
                }
                ///////////////////
                var business = _this.businesses[placeid];
                if (!business) {
                    _this.requestBusiness(placeid);
                }
                else {
                    if (business.partial)
                        _this.requestBusiness(placeid);
                    else {
                        console.log('Received complete record for ' + business.name);
                        _this.current.pending = '';
                        _this.current.placeid = business.placeid;
                        PubSub.publish('Business.current', business);
                    }
                }
            }
        };
    }
    ClientBusinessModule.prototype.init = function () {
        _super.prototype.init.call(this);
        PubSub.subscribe('Business.request.moreResult', this.onRequestMoreResults.bind(this));
    };
    ClientBusinessModule.prototype.getDefaultLocals = function () { };
    ClientBusinessModule.prototype.onFetchReceived = function (business) {
        _super.prototype.onFetchReceived.call(this, business);
        if (this.current.pending == business.placeid)
            this.current.set();
    };
    ClientBusinessModule.prototype.requestBusiness = function (placeid) {
        console.log('Requesting business ' + placeid);
        this.requestBusinesses({ placeid: placeid, partial: false });
    };
    ClientBusinessModule.prototype.requestBusinesses = function (data) {
        var _this = this;
        if (!data)
            data = {};
        this.getLocation(function (err, location) {
            if (err)
                return PubSub.publish('Geolocation.notAvailable');
            data.location = location;
            if (!data.placeid)
                console.log('Requesting nearby businesses');
            _super.prototype.request.call(_this, data);
        });
    };
    ClientBusinessModule.prototype.refresh = function () {
        this.requestBusinesses();
    };
    ClientBusinessModule.prototype.save = function () {
        // TODO: see if anything needs doing here
    };
    ClientBusinessModule.prototype.onRequestMoreResults = function () {
        var search = {
            count: SHOW_MORE_COUNT,
            iteration: ~~(_.values(this.businesses).length / SHOW_MORE_COUNT),
            placeids: _.map(this.businesses, function (b) { return b.placeid; }),
        };
        this.requestBusinesses(search);
    };
    ClientBusinessModule.prototype.getBusinessUrl = function (callback) {
        if (!this.current.placeid && this.current.pending)
            return setTimeout(this.getBusinessUrl.bind(this), 500, callback);
        if (this.current.placeid)
            return callback('/places/' + this.current.placeid);
        callback();
    };
    return ClientBusinessModule;
})(business_module_1.BusinessModule);
exports.ClientBusinessModule = ClientBusinessModule;
;
//# sourceMappingURL=business-module.js.map