var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_1 = require('../../../public/app.common/modules/module');
var TabModule = (function (_super) {
    __extends(TabModule, _super);
    function TabModule() {
        _super.apply(this, arguments);
        //TODO: put in support for caching tabs in localStorage
        this.tabHashes = [];
        this.open = [];
        this.closed = [];
    }
    TabModule.prototype.getDefaultLocals = function () { };
    TabModule.prototype.name = function () { return 'Tab'; };
    TabModule.prototype.init = function () {
        this.subscribeToWorker({
            'Tab.approved': this.addTab.bind(this)
        });
    };
    TabModule.prototype.clearPreviousData = function () {
        //TODO: see if its ok to override all previous data
        this.open = [];
        this.closed = [];
    };
    TabModule.prototype.onFetchReceived = function (tab) {
        _super.prototype.onFetchReceived.call(this, tab);
        this.addTab(tab, true);
    };
    TabModule.prototype.addTab = function (tab, isFromDb) {
        if (!_.includes(this.tabHashes, tab.hash)) {
            this.tabHashes.push(tab.hash);
            this.open.push(tab);
            if (!isFromDb) {
                console.log('New tab arrived');
                PubSub.publish('Tab.placed', tab);
            }
        }
    };
    TabModule.prototype.getOpen = function (placeid, createIfNotFound) {
        if (createIfNotFound === void 0) { createIfNotFound = true; }
        if (placeid) {
            var relevantOpenOrders = _.filter(this.open, function (o) {
                return o.placeid == placeid;
            });
            if (relevantOpenOrders.length)
                return relevantOpenOrders[0];
            if (createIfNotFound) {
                var tab = this.createTab(this.controller.modules.business.current.get(), {});
                this.open.push(tab);
                return tab;
            }
            return null;
        }
        return this.open;
    };
    TabModule.prototype.getCount = function () {
        return this.open.length;
    };
    TabModule.prototype.save = function () {
        this.saveAux(this.open, 'id');
        this.saveAux(this.closed, 'id');
    };
    TabModule.prototype.createTab = function (business, params) {
        var date = (function () {
            var now = new Date();
            return now.getDate() + '/' + (now.getMonth() + 1);
        })();
        return {
            date: date,
            table_number: params.table_number || -1,
            diner_count: params.diner_count || 1,
            server: params.server || '',
            mock_sn: Math.round(Math.random() * 10000),
            articles: params.articles || [],
            placeid: business.placeid,
            placeName: business.name
        };
    };
    TabModule.prototype.computePrice = function (factor, articles) {
        var result = Math.round(_.sum(articles, function (item) {
            return factor * item.price;
        }) * 10) / 10;
        if (!result)
            return 0;
        else
            return result;
    };
    return TabModule;
})(module_1.Module);
exports.TabModule = TabModule;
//# sourceMappingURL=tab-module.js.map