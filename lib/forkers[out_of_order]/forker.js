var business_fork_1 = require('./business-fork');
var _ = require('lodash');
var async = require('async');
var cp = require('child_process');
var Forker = (function () {
    function Forker() {
        var _this = this;
        this.businessForks = [];
        this.business = {
            fetchMatchingEntities: function (placeidsObj, yield_cb, final_cb) {
                var fork = _this.find(_this.businessForks);
                fork.fetchMatchingEntities(placeidsObj, yield_cb, final_cb);
            }
        };
        this.businessForks.push(new business_fork_1.BusinessFork());
    }
    Forker.prototype.find = function (forks) {
        var free_fork = _.find(forks, function (f) {
            return f.isFree();
        });
        if (!free_fork) {
            free_fork = new business_fork_1.BusinessFork();
            this.businessForks.push(free_fork);
        }
        return free_fork;
    };
    return Forker;
})();
exports.Forker = Forker;
//# sourceMappingURL=forker.js.map