import {logging, config, duid} from '../../app';
var _ = require('lodash');
var querystring = require('querystring');
var https = require('https');
var os = require('os');
var child_process = require('child_process');
var fs = require('fs');

export const KEY_VALUE_SEPARATOR = "::";
const A = 65;
export const OS_BATCH_RUN_PREFIX = os.platform() == 'linux' ? 'sudo ' : '';
export const THUMBNAIL = 'thumbnail';

export module Util {
    
    export function extractExtension(filePath) {
        let y = filePath.split('.');
        return y[y.length - 1].toUpperCase();
    }

    export function replaceWhiteSpaces(str, replaceWith = '_') {
        return str.replace(/\s/g, replaceWith);
    }
    export function getNowDateForFile(justDate = true) {
        let now = new Date();
        return now.getUTCFullYear() + '-' + now.getUTCMonth() + '-' + now.getUTCDate() + (!justDate ? '.' + now.getUTCHours() + '.' + now.getUTCMinutes()
            + '.' + now.getUTCSeconds() + '.' + now.getUTCMilliseconds() : '');
    }
    export function isExpired(expires) {
        let now = new Date();
        let expiry = new Date(expires);
        return now > expiry;
    }
    export function generateExpires(hours) {
        let now = new Date();
        now.setHours(now.getHours() + hours);
        return now.toISOString();
    }
    export function addArgsTo(properties, args, proto_args) {
        toProtoEntity(properties, args);
        return _.assign({}, proto_args, properties);
    }

    export function generateRandomCaseInsensitive(pattern) {
        return pattern.replace(/[x]/g, function (c) {
            let y = Math.round(Math.random() * 35);
            if (y < 10) return y.toString();
            return String.fromCharCode(A + y - 10);
        });
    }
    export function generateRandomNumber(pattern) {
        return pattern.replace(/[x]/g, function (c) {
            return Math.round(Math.random() * 9);
        });
    }
    export function getInstanceUUID(callback) {
        let command = OS_BATCH_RUN_PREFIX + ' dmidecode -t system';
        child_process.exec(command, function (err, stdout, stderr) {
            if (err || !stdout) {
                logging.error("child processes failed with error code: " +
                    err);
                logging.info('Attmpting to fetch from file instead...');
                fs.readFile('../uuid', 'ascii', (err, data) => {
                    if (!err) {
                        logging.info('Found uuid file with code: "' + data + '"'); 
                        callback(data);
                    }
                    else {
                        logging.info('Falling back to other less graceful identifiers...');
                        let interfaces = os.networkInterfaces();
                        try {
                            let address = interfaces.Ethernet[0].address;
                            return callback(uuid);
                        }
                        catch (e) { }

                        callback(duid.getDUID(1)[0]);
                    }
                });            
            }
            else {
                var uuid = /UUID: (.*)/.exec(stdout)[1];
                callback(uuid);
            }
        });
    }
    export function hash(target) {
        var hasher = require('crypto').createHash('md5');
        if (!_.isString(target)) {
            target = _.clone(target);
            delete target.hash;
            target = JSON.stringify(target);
        }
        return hasher.update(target).digest('base64');
    }
    export function replaceExtension(filePath, new_extension) {
        let y = filePath.split('.');
        y[y.length - 1] = new_extension;
        return y.join('.');
    }
    export function addPreextension(filePath, preextension) {
        let y = filePath.split('.');
        y.splice(y.length - 1, 0, preextension);
        return y.join('.');
    }
    export function getFileName(link, preextension?) {
        let x = _.last(link.split('/'));
        if (!preextension)
            return x;
        return addPreextension(x, preextension);
    }
    export function removeQueries(link) {
        let index = link.indexOf('?');
        if (index < 0) return link;
        return link.substring(0, index);
    }
    export function extractNumber(str) {
        var n = str.match("[0-9*]")[1];
        return parseInt(n);
    }
    export function getIP(req) {
        var ip;
        try {
            ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
        } catch (e) { };

        return ip;
    }
    export var valueInQuotesRegex = /(["'])(\\?.)*?\1/;
    export var filter = function (json) {
        while (!filterAux(json));
    }
    var filterAux = function (json) {
        var noEmptyEntries = true;
        _.forEach(json, (obj, key) => {
            if (typeof obj !== 'string'
                && typeof obj !== 'boolean'
                && typeof obj !== 'number') {

                if (typeof obj === 'undefined' || Object.keys(obj).length < 1) {
                    delete json[key];
                    noEmptyEntries = false;
                }
                else
                    noEmptyEntries = filterAux(obj) && noEmptyEntries;
            }
        });
        return noEmptyEntries;
    }

    export function _merge(...args) {
        return _.merge({}, ...args, (a, b) => {
            if (_.isArray(a)) {
                return a.concat(b);
            }
        });
    }
    export function merge(dest, src, withOverride: boolean) {
        for (var attrname in src) {
            if (!_.isUndefined(src[attrname]) && (withOverride || _.isUndefined(dest[attrname])))
                dest[attrname] = src[attrname];
        }
    }

    export var deepDiffMapper = function () {
        return {
            VALUE_CREATED: 'created',
            VALUE_UPDATED: 'updated',
            VALUE_DELETED: 'deleted',
            VALUE_UNCHANGED: 'unchanged',
            map: function (obj1, obj2): Object {
                if (this.isFunction(obj1) || this.isFunction(obj2)) {
                    throw 'Invalid argument. Function given, object expected.';
                }
                if (this.isValue(obj1) || this.isValue(obj2)) {
                    return { type: this.compareValues(obj1, obj2), data: obj1 || obj2 };
                }

                var diff = {};
                for (var key in obj1) {
                    if (this.isFunction(obj1[key])) {
                        continue;
                    }

                    var value2 = undefined;
                    if ('undefined' != typeof (obj2[key])) {
                        value2 = obj2[key];
                    }

                    diff[key] = this.map(obj1[key], value2);
                }
                for (var key in obj2) {
                    if (this.isFunction(obj2[key]) || ('undefined' != typeof (diff[key]))) {
                        continue;
                    }

                    diff[key] = this.map(undefined, obj2[key]);
                }

                return diff;

            },
            compareValues: function (value1, value2) {
                if (value1 === value2) {
                    return this.VALUE_UNCHANGED;
                }
                if ('undefined' == typeof (value1)) {
                    return this.VALUE_CREATED;
                }
                if ('undefined' == typeof (value2)) {
                    return this.VALUE_DELETED;
                }

                return this.VALUE_UPDATED;
            },
            isFunction: function (obj) {
                return {}.toString.apply(obj) === '[object Function]';
            },
            isArray: function (obj) {
                return {}.toString.apply(obj) === '[object Array]';
            },
            isObject: function (obj) {
                return {}.toString.apply(obj) === '[object Object]';
            },
            isValue: function (obj) {
                return !this.isObject(obj) && !this.isArray(obj);
            }
        }
    } ();
    const OBJECT_TYPE = '_object__';
    export var toProtoEntity = function (properties, json, overwrite = false) {
        let keys = Object.keys(json);
        _.forEach(keys, (key) => {
            let value = json[key], valueType, result;
            valueType = getValueType(value);
            if (valueType == 'listValue') {
                let values = _.map(value, (val) => {
                    let valType = getValueType(val);
                    return createAtomEntity(valType, val);
                });
                result = createAtomEntity(valueType, values);
            }
            else result = createAtomEntity(valueType, value);
            if (result && (overwrite || !properties[key]))
                properties[key] = result;
        });
    }

    function createAtomEntity(valueType, value){
        var entry = {} as any;
        if (valueType == OBJECT_TYPE) {
            entry.indexed = false;
            valueType = 'stringValue';
            value = OBJECT_TYPE + JSON.stringify(value);
        }
        entry[valueType] = value;
        return entry;
    }
    export var fromProtoEntities = function (entityArray, addId = false) {
        return _.map(entityArray, (item) => {
            return fromProtoEntityWithKey(item.entity);
        });
    }
    
    export var fromProtoEntityWithKey = function (entity) {
        let result = fromProtoEntity(entity.properties);
        let key = entity.key;
        let id = _.last(key.path);
        result.id = id.id || id.name;
        result.key = key;

        return result;
    }
    export var fromProtoEntity = function (properties) {
        var result = new Object() as any;
        _.forEach(properties, (obj, key) => {
            result[key] = convertFrom(obj);
        });
        return result;
    }

    function convertFrom(obj) {
        let key = Object.keys(obj)[0];
        let value = obj[Object.keys(obj)[0]];
        switch (key) {
            case 'stringValue':
                try {
                    if (value.substring(0, OBJECT_TYPE.length) == OBJECT_TYPE)
                        return JSON.parse(value.substring(OBJECT_TYPE.length));
                } catch (e) {
                    logging.error(e);
                    throw e;
                }
            case 'doubleValue':
            case 'integerValue':
            case 'booleanValue':
            case 'dateTimeValue':
                return value;
            case 'listValue':
                return _.map(value, (item) => {
                    return convertFrom(item);
                });
        }
    }

    function getValueType(value) {
        switch (typeof value) {
            case 'string':
                if (_.last(value) == 'Z' && Date.parse(value))
                    return 'dateTimeValue';
                return 'stringValue';
            case 'number':
                return 'doubleValue';
            case 'boolean':
                return 'booleanValue';
            case 'object':
                if(_.isArray(value))
                    return 'listValue';
                else
                    return OBJECT_TYPE;
            default:
                throw new Error('Illegal value type while converting to Proto format');
        }
    }

    export function postHttps(base_url, path, parameters, callback) {
        // Build the post string from an object
        var post_data = querystring.stringify(parameters);

        // An object of options to indicate where to post to
        var post_options = {
            host: base_url,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        // Set up the request
        var post_req = https.request(post_options, (res)=>{
            var data = [];
            res.setEncoding('utf8');
            res.on('data', (chunk)=> {
                data.push(chunk);
            });
            res.on('end', () => {
                callback(data);
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();

    }
}