var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var webworker_1 = require('../../../public/app.common/workers/webworker');
var BusinessWorker = (function (_super) {
    __extends(BusinessWorker, _super);
    function BusinessWorker() {
        _super.apply(this, arguments);
    }
    BusinessWorker.prototype.name = function () { return 'Business'; };
    BusinessWorker.prototype.init = function () {
        _super.prototype.init.call(this);
        this.businesses = {};
    };
    BusinessWorker.prototype.clearPreviousData = function () {
        //TODO: somehow clear previous but keep locals...
    };
    BusinessWorker.prototype.onReceive = function (data) {
        // override default onReceive which calls postMessage(['Business.received', business]);
        // the super. version is called from forwardProcessedBusinessToModule
        this.processBusiness(data);
    };
    BusinessWorker.prototype.done = function () {
        _super.prototype.done.call(this);
        this.transaction = null;
    };
    BusinessWorker.prototype.processBusiness = function (business_batch) {
        var _this = this;
        if (!_.isArray(business_batch))
            business_batch = [business_batch];
        _.forEach(business_batch, function (business) {
            _this.businesses[business.placeid] = _this.businesses[business.placeid] || {};
            if (business.hash != _this.businesses[business.placeid].hash
                && (_this.businesses[business.placeid].partial || _.isUndefined(_this.businesses[business.placeid].partial) || !business.partial)) {
                _this.fixBug001(business);
                _.assign(_this.businesses[business.placeid], business);
                _this.forwardProcessedBusinessToModule(_this.businesses[business.placeid]); //Here is the call to super.onReceive
            }
        });
    };
    BusinessWorker.prototype.forwardProcessedBusinessToModule = function (business) {
        _super.prototype.onReceive.call(this, business);
    };
    BusinessWorker.prototype.request = function (data) {
        this.transaction = new Transaction();
        _super.prototype.request.call(this, data);
    };
    BusinessWorker.prototype.isReady = function () {
        return true;
    };
    // Bug 001: queries got to be part of the db entry 
    // TODO: remove queries from cloudstorage
    BusinessWorker.prototype.fixBug001 = function (business) {
        _.forEach(business.webPhotos, function (photo) {
            if (_.includes(photo.image, '?'))
                photo.image = photo.image.substring(0, photo.image.indexOf('?'));
        });
    };
    return BusinessWorker;
})(webworker_1.WebWorker);
exports.BusinessWorker = BusinessWorker;
var Transaction = (function () {
    function Transaction() {
    }
    Transaction.prototype.inc = function () {
        this.item_counter++;
    };
    Transaction.prototype.toObject = function () {
        return {
            count: this.item_counter
        };
    };
    return Transaction;
})();
//# sourceMappingURL=business-webworker.js.map