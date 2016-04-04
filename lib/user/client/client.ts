import {logging, gapis, config, app} from '../../../app';
import {Google, Facebook, GOOGLE, FACEBOOK} from '../user';
import PubSub = require('pubsub-js');
import {Endpoint} from '../endpoint';
import {CLIENT_USER_ROUTE} from './user-client';

var _ = require('lodash');
var async = require('async');

export class Client extends Endpoint {
    // @Implements
    ROUTE() {
        return CLIENT_USER_ROUTE;
    }    
    handshake(socket, data, callback) {
        super.handshake(socket, data, (err, params) => {
            if (params.user)
                app.user.ofType(CLIENT_USER_ROUTE).open(params.cookie, data, (err, result) => {
                    this.logError(err);
                });

            callback(err, params);
        });
    }
    //////// GEOLOCATION //////////////////
    getPlaces(socket, search, yield_callback, err_callback) {
        app.geolocation.searchNearBy(search, yield_callback, err_callback);
    }
    //////// BUSINESS //////////////
    getBusiness(socket, params, callback) {
        app.business.find(params.placeid, params, callback);
    }
    //////// MENU //////////////////
    getMenus(socket, business, yield_callback, end_callback) {
        app.menu.fetchFor(business.placeid, yield_callback, end_callback);
    }

    //////// ARTICLE //////////////////
    getArticle(socket, business, bare_article, callback) {
        app.article.fetchArticle(business.placeid, bare_article.pid, callback);
    }

    //////// ORDER //////////////////
    openOrCreateOrderByBusiness(socket, data, callback) {
        var cookie = this.getCookie(socket);
        if (!cookie) return;

        var business = data.business;
        var tab = data.tab;
        var createIfNotFound = true;
        app.order.openOrCreateByBusiness(cookie, business, tab, (err, result) => {
            if (!this.logError(err) && result)
                callback(result);
        }, createIfNotFound);
    }

    openRecentOrder(socket, callback) {
        var cookie = this.getCookie(socket);
        if (!cookie) return;
        app.order.openRecent(cookie, (err, result) => {
            if (!this.logError(err) && result)
                callback(result);
        });
    }

    updateOrder(socket, data) {
        var cookie = this.getCookie(socket);
        if (!cookie) return;

        var business = data.business;
        var tab = data.tab;
        app.order.update(cookie, business, tab, (err) => {
            this.logError(err)
        });
    }

    //////// ORDER ARTICLE //////////////////
    addArticleToOrder(socket, business, article) {
        var cookie = this.getCookie(socket);
        if (!cookie) return;
        app.orderArticle.add(cookie, business, article,
            (err, result) => {
                this.logError(err);
            });
    }
    removeArticleFromOrder(socket, business, article) {
        var cookie = this.getCookie(socket);
        if (!cookie) return;
        app.orderArticle.remove(cookie, business, article,
            (err) => {
                this.logError(err);
            });
    }

    ///////////// MEDIA ///////////////
    protected canDeleteMedia(req, photo) {
        return this.canUpdateMedia(req, [photo]);
    }

    protected canUpdateMedia(req, photos) {
        // works according to REJECT_APPROVE_ALL policy
        return _.findIndex(photos, (photo) => { req.user[this.ROUTE()].username != photo.username }) < 0;
    }
}