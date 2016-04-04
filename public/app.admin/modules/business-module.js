var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var business_module_1 = require('../../../public/app.common/modules/business-module');
var AdminBusinessModule = (function (_super) {
    __extends(AdminBusinessModule, _super);
    function AdminBusinessModule() {
        _super.apply(this, arguments);
        this.current = {};
    }
    AdminBusinessModule.prototype.getDefaultLocals = function () { };
    AdminBusinessModule.prototype.init = function () {
        _super.prototype.init.call(this);
        this.subscribeToWorker({
            'Business.hash.ok': this.onBusinessesOK.bind(this),
            'Business.hash.bad': this.onBusinessesOutOfDate.bind(this),
        });
        try {
            if (localStorage && localStorage.AdminModule_businesses) {
                this.businesses = JSON.parse(localStorage.AdminModule_businesses);
                console.log('loading from businesses from cache [' + this.getAll().length + '] with hash: ' + this.businesses.hash);
                this.postMessage(['Business.cached', this.businesses]);
            }
        }
        catch (e) { }
    };
    AdminBusinessModule.prototype.refresh = function () {
        this.request();
    };
    AdminBusinessModule.prototype.onBusinessesOK = function () {
        console.log('onBusinessesOK...');
        this.onBusinessesLoaded();
    };
    AdminBusinessModule.prototype.onBusinessesOutOfDate = function () {
        console.log('onBusinessesOutOfDate...');
    };
    AdminBusinessModule.prototype.onFetchReceived = function (business) {
        // do nothing. process the complete array of businesses onFetchEnd
    };
    AdminBusinessModule.prototype.onFetchEnd = function (data) {
        _super.prototype.onFetchEnd.call(this, data);
        this.businesses = data;
        console.log('');
        console.log('in admin onFetchEnd with ' + this.getAll().length + ' businesses and hash: ' + this.businesses.hash);
        localStorage.AdminModule_businesses = JSON.stringify(this.businesses);
        this.onBusinessesLoaded();
    };
    AdminBusinessModule.prototype.onBusinessesLoaded = function () {
        PubSub.publish('Business.ready');
    };
    //TODO:!!!!
    AdminBusinessModule.prototype.save = function () {
        this.saveAux(this.businesses, 'placeid');
    };
    return AdminBusinessModule;
})(business_module_1.BusinessModule);
exports.AdminBusinessModule = AdminBusinessModule;
;
//# sourceMappingURL=business-module.js.map