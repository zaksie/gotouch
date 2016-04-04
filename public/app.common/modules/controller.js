var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var base_1 = require('../../../public/app.common/modules/base');
var utils_1 = require('../../../public/app.common/modules/utils');
var Controller = (function (_super) {
    __extends(Controller, _super);
    function Controller() {
        _super.call(this);
        this.utils = utils_1.Utils;
        this.init();
    }
    Controller.prototype.refresh = function () {
        _.forEach(this.modules, function (module) {
            module.refresh();
        });
    };
    return Controller;
})(base_1.Base);
exports.Controller = Controller;
//# sourceMappingURL=controller.js.map