var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var webworker_1 = require('../../../public/app.common/workers/webworker');
var TabWorker = (function (_super) {
    __extends(TabWorker, _super);
    function TabWorker() {
        _super.apply(this, arguments);
        this.open = [];
        this.closed = [];
    }
    TabWorker.prototype.name = function () {
        return 'Tab';
    };
    TabWorker.prototype.clearPreviousData = function () {
        //TODO: see if its ok to override all previous data
        this.open = [];
        this.closed = [];
    };
    TabWorker.prototype.isReady = function () {
        return true;
    };
    return TabWorker;
})(webworker_1.WebWorker);
exports.TabWorker = TabWorker;
//# sourceMappingURL=tab-webworker.js.map