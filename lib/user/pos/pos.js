var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var app_1 = require('../../../app');
var utils_1 = require('../../service/utils');
var endpoint_1 = require('../endpoint');
var user_pos_1 = require('./user-pos');
var user_client_1 = require('../client/user-client');
var PubSub = require('pubsub-js');
var CONST_1 = require('../../service/CONST');
var _ = require('lodash');
var async = require('async');
var order_approved_1 = require('./order-approved');
var DEFAULT_GET_BUSINESSES_OPTIONS = { location: null };
var POS = (function (_super) {
    __extends(POS, _super);
    function POS() {
        _super.call(this);
        this.memcache = new Memcache();
        this.order = new order_approved_1.ApprovedOrder();
        PubSub.subscribe('GooglePubSub.ready', this.initGooglePubSubTopics.bind(this));
    }
    POS.prototype.ROUTE = function () {
        return user_pos_1.POS_USER_ROUTE;
    };
    POS.prototype.initGooglePubSubTopics = function () {
        var _this = this;
        app_1.gapis.pubsub.getTopic(CONST_1.CONST.gPubSub.OrderApproved, function (err, topic) {
            if (err)
                return app_1.logging.error(err);
            _this.POSOrderApprovedTopic = topic;
            app_1.gapis.pubsub.subscribe(topic, CONST_1.CONST.gPubSub.OrderApproved + "Sub", function (err, subscription) {
                if (err)
                    return app_1.logging.error(err);
                _this.POSOrderApprovedSubscription = subscription;
                _this.POSOrderApprovedSubscription.on('message', _this.onOrderApproved.bind(_this));
                console.log(_this.POSOrderApprovedSubscription.id + ' set up.');
            });
        });
        app_1.gapis.pubsub.getTopic(CONST_1.CONST.gPubSub.POSStateChange, function (err, topic) {
            if (err)
                return app_1.logging.error(err);
            _this.POSStateChangeTopic = topic;
            app_1.gapis.pubsub.subscribe(topic, CONST_1.CONST.gPubSub.POSStateChange + "Sub", function (err, subscription) {
                if (err)
                    return app_1.logging.error(err);
                _this.POSStateChangeSubscription = subscription;
                _this.POSStateChangeSubscription.on('message', _this.onStateChange.bind(_this));
                console.log(_this.POSStateChangeSubscription.id + ' set up.');
            });
        });
        PubSub.subscribe(CONST_1.CONST.PubSub.TopicDisconnectUserReady, function () {
            app_1.gapis.pubsub.subscribe(app_1.admin.DisconnectUserTopic, CONST_1.CONST.gPubSub.DisconnectUser + "Sub", function (err, subscription) {
                if (err)
                    return app_1.logging.error(err);
                _this.DisconnectUserSubscription = subscription;
                _this.DisconnectUserSubscription.on('message', _this.onDisconnectUserCommand.bind(_this));
                console.log(_this.DisconnectUserSubscription.id + ' set up.');
            });
        });
        /////////////////////////////////
        PubSub.subscribe(CONST_1.CONST.PubSub.POSStateChange, function (msg, data) {
            if (_this.POSStateChangeTopic)
                _this.POSStateChangeTopic.publish({ data: data }, function (err) {
                    if (err)
                        return app_1.logging.error(err);
                });
        });
        PubSub.subscribe(CONST_1.CONST.PubSub.OrderApproved, function (msg, tab) {
            _this.order.storeApprovedOrderInDS(tab, function (err, approved_tab) {
                if (err)
                    return app_1.logging.error(CONST_1.CONST.Errors.EPIC_FAILURE, { message: err });
                if (_this.POSOrderApprovedTopic)
                    _this.POSOrderApprovedTopic.publish({ data: approved_tab }, function (err) {
                        if (err)
                            return app_1.logging.error(err);
                    });
            });
        });
    };
    POS.prototype.onDisconnect = function (socket) {
        this.unlinkConnection(socket.id);
    };
    POS.prototype.getBusinessesForSocketId = function (socketid, options, yield_callback, final_callback) {
        if (options === void 0) { options = DEFAULT_GET_BUSINESSES_OPTIONS; }
        var placeids = this.memcache.getPlaceIdByItem({ socketid: socketid });
        if (!placeids.length)
            return final_callback('Error. No placeids found');
        async.waterfall([
            function (callback) {
                app_1.app.geolocation.getLocationsFor(placeids, options.location, callback);
            },
            function (results, callback) {
                app_1.app.business.fetchMatchingEntities(results, yield_callback, callback, { partial: false });
            }], final_callback);
    };
    POS.prototype.updateBusinessState = function (params) {
        var _this = this;
        var endpoints = this.memcache.getByPlaceId(params.placeid);
        _.forEach(endpoints, function (endpoint) {
            try {
                var socket = _this.findSocket(endpoint);
                if (socket)
                    return app_1.app.io.router.modules.pos.emitData(socket, params);
            }
            catch (e) {
                app_1.logging.error(e);
            }
        });
    };
    POS.prototype.getOpenOrdersForSocketId = function (socketid, yield_callback, final_callback) {
        var placeids = this.memcache.getPlaceIdByItem({ socketid: socketid });
        if (!placeids.length)
            return final_callback('Error. User not registered for placeids.');
        this.order.fetchFor(placeids, yield_callback, final_callback);
    };
    POS.prototype.linkConnectionToPlaceIds = function (socketid, session) {
        var params = {
            socketid: socketid,
            userid: session.user.id,
        };
        params.hash = utils_1.Util.hash(params);
        return this.memcache.insert(params, session.user.placeids);
    };
    POS.prototype.unlinkConnection = function (socketid) {
        this.memcache.remove(socketid);
    };
    POS.prototype.onUploadedMenuPages = function (req, callback) {
        var propogate_callback = function (err, menu) {
            if (err)
                return app_1.logging.error(err);
            app_1.logging.info('publishing menu...');
            PubSub.publish(CONST_1.CONST.PubSub.POSStateChange, {
                placeid: req.body.placeid,
                message: 'menu-update',
                content: menu
            });
        };
        var final_callback = function (err, menu) {
            console.timeEnd('/add/menu');
            propogate_callback(err, menu);
        };
        req.body.user = req.user['/chefs'].username;
        app_1.app.menu.createFromPdf(req, req.local_uploaded_files, req.body, propogate_callback, final_callback);
        callback();
    };
    POS.prototype.findSocket = function (endpoint) {
        var sockets = app_1.app.io.of(user_pos_1.POS_USER_ROUTE).sockets;
        return _.find(sockets, function (s) { return s.id == endpoint.socketid; });
    };
    POS.prototype.onDisconnectUserCommand = function (user) {
        var entry = this.memcache.getSiblingsByItem({ userid: user.id });
        if (!entry)
            return;
        var sockets = app_1.app.io.of(user_pos_1.POS_USER_ROUTE).sockets;
        var socket = _.find(sockets, function (s) { return s.id == entry.socketid; });
        if (socket) {
            // since there is no mechanism for logging people out of their session in passport unless they make an http request
            // but only preventing further use of the system by marking their account.
            // in this case disconnect is only called when account is disabled.
            // all other situations, like revoking permissions, etc., luckily do not merit disconnection.
            socket.emit('logout', function (ack) {
                socket.disconnect();
            });
        }
    };
    POS.prototype.sendOrderToClient = function (placeid, tab, success_callback) {
        var _this = this;
        var endpoints = this.memcache.getByPlaceId(placeid);
        _.forEach(endpoints, function (endpoint) {
            try {
                var socket = _this.findSocket(endpoint);
                if (socket)
                    return socket.emit(CONST_1.CONST.POSSocket.OrderApproved, tab, success_callback);
            }
            catch (e) {
                app_1.logging.error(e);
            }
        });
    };
    POS.prototype.onStateChange = function (message) {
        console.log('in onStateChange (yay!!!!!)');
        this.updateBusinessState(message.data);
    };
    POS.prototype.onOrderApproved = function (message) {
        var _this = this;
        var tab = message.data;
        this.sendOrderToClient(tab.placeid, tab, function (code, socketid) {
            if (code == 200)
                _this.order.storeApprovedOrderAck(tab, {
                    socketid: socketid
                }, function (err) {
                    if (err)
                        app_1.logging.error(err);
                });
        });
    };
    ///////////// MEDIA ///////////////
    POS.prototype.canDeleteMedia = function (req, photo) {
        return this.canUpdateMedia(req, photo) && (photo.route == user_pos_1.POS_USER_ROUTE || photo.route == user_client_1.CLIENT_USER_ROUTE);
    };
    POS.prototype.canUpdateMedia = function (req, photos) {
        var _this = this;
        // works according to REJECT_APPROVE_ALL policy
        return _.findIndex(photos, function (photo) {
            return !(req.body.placeid == photo.placeid && _.includes(req.user(_this.ROUTE()).placeids, req.body.placeid));
        }) < 0;
    };
    return POS;
})(endpoint_1.Endpoint);
exports.POS = POS;
var Memcache = (function () {
    function Memcache() {
        this.entries = [];
    }
    // each socket id has a preassigned list of placeids.
    // but each placeid can have multiple socketids listening on it.
    Memcache.prototype.insert = function (params, placeids) {
        var _this = this;
        var linkedAlready = true;
        _.forEach(placeids, function (placeid) {
            _this.entries[placeid] = _this.entries[placeid] || [];
            var index = _.findIndex(_this.entries[placeid], function (e) {
                return e.hash == params.hash;
            });
            if (index < 0) {
                linkedAlready = false;
                _this.entries[placeid].push(params);
            }
        });
        return linkedAlready;
    };
    Memcache.prototype.remove = function (socketid) {
        for (var pid in this.entries) {
            var index = _.findIndex(this.entries[pid], function (i) {
                return i.socketid == socketid;
            });
            if (index > -1)
                this.entries[pid].splice(index, 1);
        }
    };
    Memcache.prototype.getByPlaceId = function (placeid) {
        if (this.entries[placeid])
            return this.entries[placeid];
        return null;
    };
    Memcache.prototype.getPlaceIdByItem = function (item) {
        var key = Object.keys(item)[0];
        var value = item[key];
        var pids = [];
        for (var pid in this.entries) {
            var index = _.findIndex(this.entries[pid], function (i) {
                return i[key] == value;
            });
            if (index > -1)
                pids.push(pid);
        }
        return pids;
    };
    Memcache.prototype.getSiblingsByItem = function (item) {
        var key = Object.keys(item)[0];
        var value = item[key];
        for (var pid in this.entries) {
            var index = _.findIndex(this.entries[pid], function (i) {
                return i[key] == value;
            });
            if (index > -1)
                return this.entries[pid][index];
        }
        return null;
    };
    return Memcache;
})();
//# sourceMappingURL=pos.js.map