var paypal = require('paypal-rest-sdk');
import {logging, gapis, app, config, duid} from '../../app';
import {Util} from '../service/utils';
var _ = require('lodash');
export const PAYMENT_KEY = 'Payment';
export const PAYPAL_KEY = 'Paypal';

export class Paypal {
    private CURRENCY = "ILS";
    private experience_profile_id = config.paypal.web_profile_id;
    private APPROVAL_URL = 'approval_url';
    private GET_TRANSACTION_URL = 'self';
    private EXECUTE_TRANSACTION_URL = 'execute';
    private create_web_profile_json = {
        "name": 'yummlet_test_profile_2015',
        "presentation": {
            "brand_name": "yummlet",
            "logo_image": "https://yummlet.com/public/images/nice.jpg",
            "locale_code": "he_IL"
        },
        "input_fields": {
            "allow_note": false,
            "no_shipping": 1,
            "address_override": 0
        },
        "flow_config": {
            "landing_page_type": "billing"
        }
    };
    private payment_template: any = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "https://yummlet.com/payments/paypal/return",
            "cancel_url": "https://yummlet.com/payments/paypal/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "item",
                    "sku": "item",
                    "price": "1.00",
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": "1.00"
            },
            "description": "This is the payment description."
        }]
    };
    constructor() {
        paypal.configure({
            'mode': 'sandbox', //sandbox or live
            'client_id': config.client_id,
            'client_secret': config.paypal.client_secret
        });
        //this.createWebProfile(this.create_web_profile_json);

    }

    beginTransaction(username, url, tab, callback) {
        var processedArticles = app.orderArticle.collectIdenticalArticles(tab.articles);

        if (!this.validate(username, tab, processedArticles)) return callback(new Error('missing details'));
    
        this.createPayment(tab, processedArticles, (err, result) => {
            this.saveOnGoingTransactionDetails(username, url, tab, err, result, (err2) => {
                callback(err || err2, this.getUserRefLink(result));
            });
        })
    }

    cancelCallback(data, main_callback) {
        let token = data.token;
        if (!token)
            return;
        let keys = [this.constructPaymentKey(token)];
        gapis.datastore.lookup(keys, (err, results) => {
            if (err) {
                main_callback(err, '/');
            }
            let url = results.found[0].entity.properties.last_url.stringValue;

            if (results.found[0].entity.properties.canceled)
                return main_callback(new Error('transaction was already canceled'), url);

            if (results.found[0].entity.properties.success)
                return main_callback(new Error('transaction was already executed'), url);

            results.found[0].entity.properties.canceled = { booleanValue: true };
            let entities = [results.found[0].entity];

            var callback = (err) => {
                if (err) logging.error(err);
                main_callback(err, url);
            };

            gapis.datastore.upsert(entities, callback)

        });
    }

    returnCallback(data, main_callback) {
        let paymentId = data.paymentId;
        let token = data.token;
        let payerID = data.PayerID;
        let keys = [this.constructPaymentKey(token)];
        gapis.datastore.lookup(keys, (err, results) => {
            if (err) {
                main_callback(err, '/');
            }
            let entities = [results.found[0].entity];
            let transaction = Util.fromProtoEntity(entities[0].properties);

            let url = transaction.last_url;
            let tab = transaction.tab;

            if (results.found[0].entity.properties.canceled)
                return main_callback(new Error('transaction was already canceled'), url);

            if (results.found[0].entity.properties.success)
                return main_callback(new Error('transaction was already executed'), url);

            var execute_payment_json = {
                payer_id: payerID,
                transactions: [{
                    amount: {
                        currency: transaction.currency,
                        total: transaction.total
                    }
                }]
            };

            paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                if (error) {
                    logging.error(error.response);
                    entities[0].properties.executionError = {
                        stringValue: JSON.stringify(error.response), indexed: false
                    };
                } else {
                    logging.info("Getting Payment Response");
                    entities[0].properties.success = {
                        booleanValue: true
                    };
                    entities[0].properties.executionSuccess = {
                        stringValue: JSON.stringify(payment), indexed: false
                    };
                }


                var callback = (err) => {
                    if (err) logging.error(err);
                    main_callback(err, url, tab);
                };

                gapis.datastore.upsert(entities, callback)
            });

        });
    }

    private createWebProfile(create_web_profile_json) {
        paypal.webProfile.create(create_web_profile_json, (error, web_profile) => {
            if (error) {
                throw error;
            } else {

                //Set the id of the created payment experience in payment json
                this.experience_profile_id = web_profile.id;
            }
        });
    }

    private createPayment(tab, processedArticles, callback) {
        var payment_json = _.extend({}, this.payment_template);
        payment_json.transactions = this.constructTransactions(tab, processedArticles);
        paypal.payment.create(payment_json, callback);
    }

    private validate(cookie, tab, processedArticles) {
        return tab && tab.placeid && processedArticles && processedArticles.length > 0 && tab.tip && tab.total;
    }

    private constructTransactions(tab, processedArticles) {
        var items = _.map(processedArticles, (article) => {
            return {
                name: article.name,
                sku: article.id,
                price: this.convertToPaypalFormat(article.price),
                currency: "ILS",
                quantity: article.quantity || 1
            }; 
        });

        items.push({
            name: "tip",
            price: this.convertToPaypalFormat(tab.tip),
            currency: "ILS",
            quantity: 1
        });


        let transactions = [{
            "item_list": { items: items },
            "amount": {
                "currency": this.CURRENCY,
                "total": this.convertToPaypalFormat(tab.total)
            },
            "description": this.getDescription(tab.placeName)
        }];

        Util.filter(transactions);
        return transactions;
    }

    private convertToPaypalFormat(sum) {
        return (Math.round(sum * 100) / 100).toFixed(2).toString();
    }

    private getDescription(placeName) {
        return "yummlet bill for " + placeName;
    }

    private saveOnGoingTransactionDetails(username, url, tab, err, result, callback){
        this.saveInDatastore(username, url, tab, err, result, callback);
    }

    private saveInDatastore(username, url, tab, err, result, callback) {
        var entities = [this.constructTransactionForDS(username, url, tab, err, result)];
        gapis.datastore.upsert(entities, callback)
    }

    private getUserRefLink(result) {
        if (!result) return null;

        return _.find(result.links, (link) => {
            return link.rel == this.APPROVAL_URL;
        }).href;
    }

    private constructPaymentKey(token) {
        return {
            path: [{ kind: PAYMENT_KEY, name: 'P' + token }, { kind: PAYPAL_KEY, name: token }]
        };
     
    }
    private constructTransactionForDS(username, url, tab, err, result) {
        let token = this.getToken(result);
        let key = this.constructPaymentKey(token);
        let time = new Date().toISOString();
        let properties;
        properties = {
            username: { stringValue: username },
            last_url: { stringValue: url },
            id: { stringValue: result.id },
            token: { stringValue: result.token },
            total: { stringValue: this.convertToPaypalFormat(tab.total) },
            currency: { stringValue: this.CURRENCY },
            tab: { stringValue: JSON.stringify(tab), indexed: false },
            error: { stringValue: JSON.stringify(err), indexed: false },
            result: { stringValue: JSON.stringify(result), indexed: false },
        };
        Util.filter(properties);

        return { key: key, properties: properties };
    }

    private getToken(result) {
        if (!result) return "ZERO_" + duid.getDUID(1)[0];

        let link = _.find(result.links, (link) => {
            return link.rel == this.APPROVAL_URL;
        }).href;

        let token = link.substring(link.indexOf('token=') + 'token='.length);
        return token;
    }
}