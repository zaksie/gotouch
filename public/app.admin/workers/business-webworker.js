var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var business_webworker_1 = require('../../../public/app.common/workers/business-webworker');
var AdminBusinessWorker = (function (_super) {
    __extends(AdminBusinessWorker, _super);
    function AdminBusinessWorker() {
        _super.apply(this, arguments);
    }
    AdminBusinessWorker.prototype.REQUEST_MESSAGE = function () {
        return 'request-businesses';
    };
    AdminBusinessWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'receive-business-batch';
    };
    AdminBusinessWorker.prototype.init = function () {
        _super.prototype.init.call(this);
        this.subscribeToModule({
            'Business.cached': this.onReceiveCachedBusinesses.bind(this),
        });
        this.socket.on('receive-business-hash', this.onReceiveHash.bind(this));
        this.socket.on('receive-business-hash-end', this.onReceiveHashEnd.bind(this));
        this.socket.on('receive-business-hash-error', this.onReceiveHashError.bind(this));
    };
    AdminBusinessWorker.prototype.request = function () {
        this.socket.emit('request-business-hash');
    };
    AdminBusinessWorker.prototype.onReceiveEnd = function (data) {
        this.businesses.hash = this.businesses.tmp_hash;
        _super.prototype.onReceiveEnd.call(this, this.businesses); //send all businesses at once when done. consider changing this
    };
    AdminBusinessWorker.prototype.onReceiveCachedBusinesses = function (businesses) {
        this.businesses = businesses;
    };
    AdminBusinessWorker.prototype.onReceiveHash = function (percent) {
        console.log('Receiving business hash....');
    };
    AdminBusinessWorker.prototype.onReceiveHashEnd = function (hash) {
        if (this.businesses.hash != hash) {
            this.businesses.tmp_hash = hash;
            _super.prototype.request.call(this);
            postMessage(['Business.hash.bad']);
        }
        else {
            postMessage(['Business.hash.ok']);
        }
    };
    AdminBusinessWorker.prototype.onReceiveHashError = function (err) {
        console.error(err);
    };
    return AdminBusinessWorker;
})(business_webworker_1.BusinessWorker);
exports.AdminBusinessWorker = AdminBusinessWorker;
//# sourceMappingURL=business-webworker.js.map