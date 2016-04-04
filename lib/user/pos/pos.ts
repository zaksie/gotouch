import {logging, config, gapis, app, admin} from '../../../app';
import {Util} from '../../service/utils';
import {Endpoint} from '../endpoint';
import {BUSINESS_KEY} from '../../business/business';
import {POS_USER_ROUTE} from './user-pos';
import {CLIENT_USER_ROUTE} from '../client/user-client';
import PubSub = require('pubsub-js');
import {CONST} from '../../service/CONST';
var _ = require('lodash');
var async = require('async');
import {ApprovedOrder} from './order-approved';

const DEFAULT_GET_BUSINESSES_OPTIONS = { location: null };
export class POS extends Endpoint {
    /* Note about sending paid-for tabs to pos endpoints:
     * All connected servers should try to send tab to endpoints
     * but at the end of the day, it lies with endpoints to make sure they receive all tabs.
     * If an endpoint is down at the moment it can pull orders later and see if they are marked "sent" and "done".
     * an alert should be send if a tab doesn't get sent within X interval
    */
    order;
    ROUTE() {
        return POS_USER_ROUTE;
    }
    private POSOrderApprovedSubscription;
    private POSOrderApprovedTopic;

    private POSStateChangeSubscription;
    private POSStateChangeTopic;

    private DisconnectUserSubscription;

    private memcache = new Memcache();

    constructor() {
        super();
        this.order = new ApprovedOrder();
        PubSub.subscribe('GooglePubSub.ready', this.initGooglePubSubTopics.bind(this));
    }
    initGooglePubSubTopics() {
        gapis.pubsub.getTopic(CONST.gPubSub.OrderApproved, (err, topic) => {
            if (err)
                return logging.error(err);
            this.POSOrderApprovedTopic = topic;
            gapis.pubsub.subscribe(topic, CONST.gPubSub.OrderApproved + "Sub", (err, subscription) => {
                if (err)
                    return logging.error(err);
                this.POSOrderApprovedSubscription = subscription;
                this.POSOrderApprovedSubscription.on('message', this.onOrderApproved.bind(this));
                console.log(this.POSOrderApprovedSubscription.id + ' set up.');
            });
        });

        gapis.pubsub.getTopic(CONST.gPubSub.POSStateChange, (err, topic) => {
            if (err)
                return logging.error(err);
            this.POSStateChangeTopic = topic;
            gapis.pubsub.subscribe(topic, CONST.gPubSub.POSStateChange + "Sub", (err, subscription) => {
                if (err)
                    return logging.error(err);
                this.POSStateChangeSubscription = subscription;
                this.POSStateChangeSubscription.on('message', this.onStateChange.bind(this));
                console.log(this.POSStateChangeSubscription.id + ' set up.');
            });
        });

        PubSub.subscribe(CONST.PubSub.TopicDisconnectUserReady, () => {
            gapis.pubsub.subscribe(admin.DisconnectUserTopic, CONST.gPubSub.DisconnectUser + "Sub", (err, subscription) => {
                if (err)
                    return logging.error(err);
                this.DisconnectUserSubscription = subscription;
                this.DisconnectUserSubscription.on('message', this.onDisconnectUserCommand.bind(this));
                console.log(this.DisconnectUserSubscription.id + ' set up.');

            });
        });
        /////////////////////////////////
        PubSub.subscribe(CONST.PubSub.POSStateChange, (msg, data) => {
            if (this.POSStateChangeTopic)
                this.POSStateChangeTopic.publish({ data: data }, (err) => {
                    if (err) return logging.error(err);
                });
        });

        PubSub.subscribe(CONST.PubSub.OrderApproved, (msg, tab) => {
            this.order.storeApprovedOrderInDS(tab, (err, approved_tab) => {
                if (err) return logging.error(CONST.Errors.EPIC_FAILURE, { message: err });
                if (this.POSOrderApprovedTopic)
                    this.POSOrderApprovedTopic.publish({ data: approved_tab }, (err) => {
                        if (err) return logging.error(err);
                    });
            });
        });

    }

    onDisconnect(socket) {
        this.unlinkConnection(socket.id);
    }

    getBusinessesForSocketId(socketid, options = DEFAULT_GET_BUSINESSES_OPTIONS, yield_callback, final_callback) {
        let placeids = this.memcache.getPlaceIdByItem({ socketid: socketid });
        if (!placeids.length)
            return final_callback('Error. No placeids found');
        async.waterfall([
            (callback) => {
                app.geolocation.getLocationsFor(placeids, options.location, callback);
            },
            (results, callback) => {
                app.business.fetchMatchingEntities(results, yield_callback, callback, { partial: false });
            }], final_callback);
    }

    updateBusinessState(params) {
        let endpoints = this.memcache.getByPlaceId(params.placeid);
        _.forEach(endpoints, (endpoint) => {
            try {
                let socket = this.findSocket(endpoint);
                if (socket)
                    return app.io.router.modules.pos.emitData(socket, params);
            }
            catch (e) {
                logging.error(e);
            }
        });
    }


    getOpenOrdersForSocketId(socketid, yield_callback, final_callback) {
        let placeids = this.memcache.getPlaceIdByItem({ socketid: socketid });
        if (!placeids.length) return final_callback('Error. User not registered for placeids.');
        this.order.fetchFor(placeids, yield_callback, final_callback);
    }

    linkConnectionToPlaceIds(socketid, session) {
        let params = {
            socketid: socketid,
            userid: session.user.id,
        } as any;
        params.hash = Util.hash(params);
        return this.memcache.insert(params, session.user.placeids);
    }

    unlinkConnection(socketid) {
        this.memcache.remove(socketid);
    }
    onUploadedMenuPages(req, callback) {
        let propogate_callback = (err, menu) => {
            if (err) return logging.error(err);
            logging.info('publishing menu...');
            PubSub.publish(CONST.PubSub.POSStateChange, {
                placeid: req.body.placeid,
                message: 'menu-update',
                content: menu
            });
        };
        let final_callback = (err, menu) => {
            console.timeEnd('/add/menu');
            propogate_callback(err, menu);
        };
        req.body.user = req.user['/chefs'].username;
        app.menu.createFromPdf(req, req.local_uploaded_files, req.body, propogate_callback, final_callback);
        callback();
    }
    
    private findSocket(endpoint) {
        let sockets = app.io.of(POS_USER_ROUTE).sockets;
        return _.find(sockets, (s) => { return s.id == endpoint.socketid; });
    }
    private onDisconnectUserCommand(user) {
        let entry = this.memcache.getSiblingsByItem({ userid: user.id });
        if (!entry) return;

        let sockets = app.io.of(POS_USER_ROUTE).sockets;
        let socket = _.find(sockets, (s) => { return s.id == entry.socketid; });
        if (socket) {
            // since there is no mechanism for logging people out of their session in passport unless they make an http request
            // but only preventing further use of the system by marking their account.
            // in this case disconnect is only called when account is disabled.
            // all other situations, like revoking permissions, etc., luckily do not merit disconnection.
            socket.emit('logout', (ack) => {
                socket.disconnect();
            });
        }
    }
    private sendOrderToClient(placeid, tab, success_callback) {
        let endpoints = this.memcache.getByPlaceId(placeid);
        _.forEach(endpoints, (endpoint) => {
            try {
                let socket = this.findSocket(endpoint);
                if (socket)
                    return socket.emit(CONST.POSSocket.OrderApproved, tab, success_callback);
            }
            catch (e) {
                logging.error(e);
            }
        });
    }
    private onStateChange(message) {
        console.log('in onStateChange (yay!!!!!)');
        this.updateBusinessState(message.data);
    }
    private onOrderApproved(message) {
        let tab = message.data;
        this.sendOrderToClient(tab.placeid, tab, (code, socketid) => {
            if (code == 200)
                this.order.storeApprovedOrderAck(tab, {
                    socketid: socketid
                }, (err) => {
                    if (err) logging.error(err);
                });
        });
    }
    
    ///////////// MEDIA ///////////////
    protected canDeleteMedia(req, photo) {
        return this.canUpdateMedia(req, photo) && (photo.route == POS_USER_ROUTE || photo.route == CLIENT_USER_ROUTE); 
    }

    protected canUpdateMedia(req, photos) {
        // works according to REJECT_APPROVE_ALL policy
        return _.findIndex(photos, (photo) => {
            return !(req.body.placeid == photo.placeid && _.includes(req.user(this.ROUTE()).placeids, req.body.placeid));
        }) < 0;
    }
}

class Memcache {
    entries = [];
    
    // each socket id has a preassigned list of placeids.
    // but each placeid can have multiple socketids listening on it.
    insert(params, placeids) {
        let linkedAlready = true;
        _.forEach(placeids, (placeid) => {
            this.entries[placeid] = this.entries[placeid] || [];
            let index = _.findIndex(this.entries[placeid], (e) => {
                return e.hash == params.hash;
            });
            if(index < 0) {
                linkedAlready = false;
                this.entries[placeid].push(params);
            }
        });
        return linkedAlready;
    }

    remove(socketid) {
        for (let pid in this.entries) {
            let index = _.findIndex(this.entries[pid], (i) => {
                return i.socketid == socketid;
            });
            if (index > -1)
                this.entries[pid].splice(index, 1);
        }
    }

    getByPlaceId(placeid) {
        if (this.entries[placeid])
            return this.entries[placeid];
        return null;
    }

    getPlaceIdByItem(item) {
        let key = Object.keys(item)[0];
        let value = item[key];
        let pids = [];
        for (var pid in this.entries) {
            let index = _.findIndex(this.entries[pid], (i) => {
                return i[key] == value;
            });
            if (index > -1)
                pids.push(pid);
        }
        return pids;
    }

    getSiblingsByItem(item) {
        let key = Object.keys(item)[0];
        let value = item[key];
        for (var pid in this.entries) {
            let index = _.findIndex(this.entries[pid], (i) => {
                return i[key] == value;
            });
            if (index > -1)
                return this.entries[pid][index];
        }
        return null;
    }



}