import {logging, gapis, config, client, duid, app} from '../../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../../service/utils';
import {UNREGISTERED_USER_KEY} from './user-generic';
import {OPEN_ORDER_KEY} from './order';
import {BUSINESS_KEY} from '../../business/business';

var async = require('async');
var _ = require('lodash');

export const ORDER_ARTICLE_KEY = 'OrderArticle';

export class OrderArticle {
    add(cookie, business, article, callback) {
        var entities = [];
        entities.push(this.constructOrderArticle(cookie, business, article));
        gapis.datastore.upsert(entities, callback);
        app.order.updateTime(cookie, business, callback);
    }
    remove(cookie, business, article, callback) {
        var keys = [];
        keys.push(this.constructKey(cookie, business, article));
        gapis.datastore.delete(keys, callback);
        app.order.updateTime(cookie, business, callback);
    }
    
    fetchByCookieId(cookie, placeid, callback, tx) {
        var gqlQuery = "SELECT * FROM " + ORDER_ARTICLE_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + UNREGISTERED_USER_KEY + ", '" + cookie.id + "'," + OPEN_ORDER_KEY + ", '" + placeid + "')";
        gapis.datastore.runGQLQuery(gqlQuery, callback, tx);
    }

    collectIdenticalArticles(articles) {
        var groups = _.groupBy(articles, (article) => {
            return this.getCustomizationId(article);
        });

        return _.map(groups, (group) => {
            group[0].quantity = group.length;
            return group[0];
        });
    }

    getCustomizationId(article) {
        return article.pid + _.sum(article.specials, (special) => {
            let arr = duid.hashidDecode(special);
            return _.sum(arr);
        });
    }

    private constructKey(cookie, business, article) {
        return {
            path: [{ kind: UNREGISTERED_USER_KEY, name: cookie.id },
                { kind: OPEN_ORDER_KEY, name: business.placeid },
                { kind: ORDER_ARTICLE_KEY, name: article.uuid }]
        };
    }
    private constructOrderArticle(cookie, business, article) {
        var specials = this.constructSpecialRequests(article);
        var key = this.constructKey(cookie, business, article);
        var properties = {
            specials: specials,
            time: { dateTimeValue: new Date().toISOString() },
            coupon: { stringValue: article.coupon },
            tableNo: { stringValue: article.tableNo }, //this is supposed to allow ordering to multiple tables
            deliveryType: { stringValue: article.deliveryType },
            pid: { stringValue: article.pid }
        };

        Util.filter(properties);

        return { key: key, properties: properties };
    }

    private constructSpecialRequests(article) {
        if (!article.specials)
            return undefined;

        var specials = [];
        _.forEach(article.specials, (special) => {
            specials.push({ stringValue: special.key + KEY_VALUE_SEPARATOR + special.value });
        });

        return { listValue: specials };
    }

}


