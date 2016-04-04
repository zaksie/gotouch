var paypal = require('paypal-rest-sdk');
var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var _ = require('lodash');
exports.PAYMENT_KEY = 'Payment';
exports.PAYPAL_KEY = 'Paypal';
var Paypal = (function () {
    function Paypal() {
        this.CURRENCY = "ILS";
        this.experience_profile_id = app_1.config.paypal.web_profile_id;
        this.APPROVAL_URL = 'approval_url';
        this.GET_TRANSACTION_URL = 'self';
        this.EXECUTE_TRANSACTION_URL = 'execute';
        this.create_web_profile_json = {
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
        this.payment_template = {
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
        paypal.configure({
            'mode': 'sandbox',
            'client_id': app_1.config.client_id,
            'client_secret': app_1.config.paypal.client_secret
        });
        //this.createWebProfile(this.create_web_profile_json);
    }
    Paypal.prototype.beginTransaction = function (username, url, tab, callback) {
        var _this = this;
        var processedArticles = app_1.app.orderArticle.collectIdenticalArticles(tab.articles);
        if (!this.validate(username, tab, processedArticles))
            return callback(new Error('missing details'));
        this.createPayment(tab, processedArticles, function (err, result) {
            _this.saveOnGoingTransactionDetails(username, url, tab, err, result, function (err2) {
                callback(err || err2, _this.getUserRefLink(result));
            });
        });
    };
    Paypal.prototype.cancelCallback = function (data, main_callback) {
        var token = data.token;
        if (!token)
            return;
        var keys = [this.constructPaymentKey(token)];
        app_1.gapis.datastore.lookup(keys, function (err, results) {
            if (err) {
                main_callback(err, '/');
            }
            var url = results.found[0].entity.properties.last_url.stringValue;
            if (results.found[0].entity.properties.canceled)
                return main_callback(new Error('transaction was already canceled'), url);
            if (results.found[0].entity.properties.success)
                return main_callback(new Error('transaction was already executed'), url);
            results.found[0].entity.properties.canceled = { booleanValue: true };
            var entities = [results.found[0].entity];
            var callback = function (err) {
                if (err)
                    app_1.logging.error(err);
                main_callback(err, url);
            };
            app_1.gapis.datastore.upsert(entities, callback);
        });
    };
    Paypal.prototype.returnCallback = function (data, main_callback) {
        var paymentId = data.paymentId;
        var token = data.token;
        var payerID = data.PayerID;
        var keys = [this.constructPaymentKey(token)];
        app_1.gapis.datastore.lookup(keys, function (err, results) {
            if (err) {
                main_callback(err, '/');
            }
            var entities = [results.found[0].entity];
            var transaction = utils_1.Util.fromProtoEntity(entities[0].properties);
            var url = transaction.last_url;
            var tab = transaction.tab;
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
                    app_1.logging.error(error.response);
                    entities[0].properties.executionError = {
                        stringValue: JSON.stringify(error.response), indexed: false
                    };
                }
                else {
                    app_1.logging.info("Getting Payment Response");
                    entities[0].properties.success = {
                        booleanValue: true
                    };
                    entities[0].properties.executionSuccess = {
                        stringValue: JSON.stringify(payment), indexed: false
                    };
                }
                var callback = function (err) {
                    if (err)
                        app_1.logging.error(err);
                    main_callback(err, url, tab);
                };
                app_1.gapis.datastore.upsert(entities, callback);
            });
        });
    };
    Paypal.prototype.createWebProfile = function (create_web_profile_json) {
        var _this = this;
        paypal.webProfile.create(create_web_profile_json, function (error, web_profile) {
            if (error) {
                throw error;
            }
            else {
                //Set the id of the created payment experience in payment json
                _this.experience_profile_id = web_profile.id;
            }
        });
    };
    Paypal.prototype.createPayment = function (tab, processedArticles, callback) {
        var payment_json = _.extend({}, this.payment_template);
        payment_json.transactions = this.constructTransactions(tab, processedArticles);
        paypal.payment.create(payment_json, callback);
    };
    Paypal.prototype.validate = function (cookie, tab, processedArticles) {
        return tab && tab.placeid && processedArticles && processedArticles.length > 0 && tab.tip && tab.total;
    };
    Paypal.prototype.constructTransactions = function (tab, processedArticles) {
        var _this = this;
        var items = _.map(processedArticles, function (article) {
            return {
                name: article.name,
                sku: article.id,
                price: _this.convertToPaypalFormat(article.price),
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
        var transactions = [{
                "item_list": { items: items },
                "amount": {
                    "currency": this.CURRENCY,
                    "total": this.convertToPaypalFormat(tab.total)
                },
                "description": this.getDescription(tab.placeName)
            }];
        utils_1.Util.filter(transactions);
        return transactions;
    };
    Paypal.prototype.convertToPaypalFormat = function (sum) {
        return (Math.round(sum * 100) / 100).toFixed(2).toString();
    };
    Paypal.prototype.getDescription = function (placeName) {
        return "yummlet bill for " + placeName;
    };
    Paypal.prototype.saveOnGoingTransactionDetails = function (username, url, tab, err, result, callback) {
        this.saveInDatastore(username, url, tab, err, result, callback);
    };
    Paypal.prototype.saveInDatastore = function (username, url, tab, err, result, callback) {
        var entities = [this.constructTransactionForDS(username, url, tab, err, result)];
        app_1.gapis.datastore.upsert(entities, callback);
    };
    Paypal.prototype.getUserRefLink = function (result) {
        var _this = this;
        if (!result)
            return null;
        return _.find(result.links, function (link) {
            return link.rel == _this.APPROVAL_URL;
        }).href;
    };
    Paypal.prototype.constructPaymentKey = function (token) {
        return {
            path: [{ kind: exports.PAYMENT_KEY, name: 'P' + token }, { kind: exports.PAYPAL_KEY, name: token }]
        };
    };
    Paypal.prototype.constructTransactionForDS = function (username, url, tab, err, result) {
        var token = this.getToken(result);
        var key = this.constructPaymentKey(token);
        var time = new Date().toISOString();
        var properties;
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
        utils_1.Util.filter(properties);
        return { key: key, properties: properties };
    };
    Paypal.prototype.getToken = function (result) {
        var _this = this;
        if (!result)
            return "ZERO_" + app_1.duid.getDUID(1)[0];
        var link = _.find(result.links, function (link) {
            return link.rel == _this.APPROVAL_URL;
        }).href;
        var token = link.substring(link.indexOf('token=') + 'token='.length);
        return token;
    };
    return Paypal;
})();
exports.Paypal = Paypal;
//# sourceMappingURL=paypal.js.map