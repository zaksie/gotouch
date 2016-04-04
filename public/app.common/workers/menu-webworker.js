var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var webworker_1 = require('../../../public/app.common/workers/webworker');
var MenuWorker = (function (_super) {
    __extends(MenuWorker, _super);
    function MenuWorker() {
        _super.apply(this, arguments);
    }
    MenuWorker.prototype.RECEIVE_MESSAGE = function () {
        return 'menu-update';
    };
    MenuWorker.prototype.name = function () {
        return 'Menu';
    };
    MenuWorker.prototype.clearPreviousData = function () { };
    return MenuWorker;
})(webworker_1.WebWorker);
exports.MenuWorker = MenuWorker;
//# sourceMappingURL=menu-webworker.js.map