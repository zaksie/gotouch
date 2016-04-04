var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var business_module_1 = require('../../../public/app.common/modules/business-module');
var COLOR_BANK = ['#990000', '#99FF00', '#CC0066', '#CC00FF', '#006633', '#FFFFCC', '#FFFFFF', '#000000'];
var POSBusinessModule = (function (_super) {
    __extends(POSBusinessModule, _super);
    function POSBusinessModule() {
        _super.apply(this, arguments);
        this.current = {};
    }
    POSBusinessModule.prototype.getDefaultLocals = function () {
        var _this = this;
        return {
            color: (function () {
                var inUse = _.map(_this.businesses, function (b) {
                    return b.locals.color;
                });
                return _.find(COLOR_BANK, function (color) {
                    return !_.includes(inUse, color);
                });
            })()
        };
    };
    POSBusinessModule.prototype.requestBusinesses = function () {
        var _this = this;
        if (!this.controller.modules.user.current.linked)
            return console.log('Cannot request owned businesses as user is not linked');
        console.log('Requesting owned businesses');
        this.getLocation(function (err, location) {
            _super.prototype.request.call(_this, location);
        });
    };
    POSBusinessModule.prototype.refresh = function () {
        this.requestBusinesses();
    };
    POSBusinessModule.prototype.save = function () {
        this.saveAux(this.businesses, 'placeid');
    };
    return POSBusinessModule;
})(business_module_1.BusinessModule);
exports.POSBusinessModule = POSBusinessModule;
;
//# sourceMappingURL=business-module.js.map