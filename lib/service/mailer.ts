import {logging, config, gapis} from '../../app';
var sendgrid = require('sendgrid')(process.env.SENDGRID_API_KEY);
import PubSub = require('pubsub-js');
var jade = require('jade');

export const BLACK_LISTED_EMAIL_KEY = 'BlacklistedEmail';
export enum From { ADMIN_ATALLENBY = 0, ADMIN_YUMMLET=0 };
const FROM = ['admin@at-allenby.com'];
const TO_ME = 'at.allenby@gmail.com';
export class Mailer{
    send(subject: string, html: string, from: From, to: string, callback) {
        this.checkIfNotBlacklisted(to, (err, isBlacklisted) => {
            if (err) return callback(err);
            if (isBlacklisted) return callback(new Error('BLACKLISTED'));
            sendgrid.send(this.createArgs(subject, html, from, to), callback);
        });
    }

    sendActivation(data, callback) {
        data.logo_url = config.dns + '/public/images/logo.png'; 
        let html = jade.renderFile('./lib/email-templates/activation.jade', data);
        this.send('Activate your account at yummlet.com', html, From.ADMIN_YUMMLET, data.email, callback);
    }

    sendResetPassword(data, callback){
        data.logo_url = config.dns + '/public/images/logo.png'; 
        let html = jade.renderFile('./lib/email-templates/reset-password.jade', data);
        this.send('Reset your account password for yummlet.com', html, From.ADMIN_YUMMLET, data.email, callback);
    }
    sendContactRequest(subject, html, callback) {
        this.send(subject, html, From.ADMIN_YUMMLET, TO_ME, callback);
    }
    private checkIfNotBlacklisted(to, callback) {
        var mid_callback = (err, result) => {
            if (err) return callback(err);
            callback(null, result.found.length);
        };
        var keys = [{
            path: [{ kind: BLACK_LISTED_EMAIL_KEY, name: to }]
        }];
        gapis.datastore.lookup(keys, mid_callback, null);
    }
    private createArgs(subject: string, html: string, from:From, to: string) {
        var options = {
            from: FROM[from], 
            to: to, 
            subject: subject,
            html: html
        };

        return options;
    }
}