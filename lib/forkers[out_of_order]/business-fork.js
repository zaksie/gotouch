var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var abstract_forker_1 = require('./abstract-forker');
var business_1 = require('../business');
var BusinessFork = (function (_super) {
    __extends(BusinessFork, _super);
    function BusinessFork() {
        _super.apply(this, arguments);
        this.app = {
            business: new business_1.Business()
        };
    }
    /* Override */
    BusinessFork.prototype.init = function () {
        var _this = this;
        process.on('message', function (msg, data) {
            if (msg == 'fetchMatchingEntities') {
                var placeidsObjs = JSON.parse(data.placeidsObjs);
                var options = JSON.parse(data.options);
                _this.app.business.fetchMatchingEntities(placeidsObjs, function (item) {
                    abstract_forker_1.logging.info(item);
                }, function (err) {
                    if (err)
                        abstract_forker_1.logging.err(err);
                }, options);
            }
        });
    };
    BusinessFork.prototype.fetchMatchingEntities = function (placeidsObj, yield_cb, final_cb) {
    };
    return BusinessFork;
})(abstract_forker_1.AbstractForker);
exports.BusinessFork = BusinessFork;
//# sourceMappingURL=business-fork.js.map