var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_1 = require('../../../public/app.common/modules/module');
var paypalPostUrl = '/payments/paypal/pay';
var ClientPaymentModule = (function (_super) {
    __extends(ClientPaymentModule, _super);
    function ClientPaymentModule() {
        _super.apply(this, arguments);
        this.current = {};
    }
    ClientPaymentModule.prototype.name = function () { return 'Payment'; };
    ClientPaymentModule.prototype.refresh = function () { };
    ClientPaymentModule.prototype.getDefaultLocals = function () { };
    ClientPaymentModule.prototype.save = function () { };
    ClientPaymentModule.prototype.init = function () { };
    ClientPaymentModule.prototype.clearPreviousData = function () { };
    ClientPaymentModule.prototype.payInPaypal = function (tab, successCallback, failureCallback) {
        var data = { tab: JSON.stringify(tab) };
        $.post(paypalPostUrl, data, successCallback).fail(failureCallback).error(failureCallback);
    };
    return ClientPaymentModule;
})(module_1.Module);
exports.ClientPaymentModule = ClientPaymentModule;
//# sourceMappingURL=payment-module.js.map