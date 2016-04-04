import {Module} from '../../../public/app.common/modules/module';
declare var $;
const paypalPostUrl = '/payments/paypal/pay';
export class ClientPaymentModule extends Module { 
    current = {};
    name() { return 'Payment'; }
    refresh() { }
    getDefaultLocals() { }
    save() { }
    init() { }
    clearPreviousData() { }
    payInPaypal(tab, successCallback, failureCallback) {
        var data = { tab: JSON.stringify(tab) };
        $.post(paypalPostUrl, data, successCallback).fail(failureCallback).error(failureCallback);
    }
}