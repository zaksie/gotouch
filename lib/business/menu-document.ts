import {logging, gapis, config, duid} from '../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../service/utils';
import {BUSINESS_KEY} from './business';
import PubSub = require('pubsub-js');
import {WEBSITE_KEY, WebsiteDocument} from './website';
var async = require('async');
var _ = require('lodash');

export const MENU_DOCUMENT_KEY = 'MenuDocument';
export const MENU_PAGE_KEY = 'MenuPage';
export class MenuDocument extends WebsiteDocument {
    getKeyName(): string {
        return MENU_DOCUMENT_KEY;
    }

    // NOT IN USE
    private constructKey(website){
        return {
            path: [{ kind: WEBSITE_KEY, name: website }]
        };
    }
}