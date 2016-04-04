var app_1 = require('../../app');
var _ = require('lodash');
var querystring = require('querystring');
var https = require('https');
var os = require('os');
var child_process = require('child_process');
var fs = require('fs');
exports.KEY_VALUE_SEPARATOR = "::";
var A = 65;
exports.OS_BATCH_RUN_PREFIX = os.platform() == 'linux' ? 'sudo ' : '';
exports.THUMBNAIL = 'thumbnail';
var Util;
(function (Util) {
    function extractExtension(filePath) {
        var y = filePath.split('.');
        return y[y.length - 1].toUpperCase();
    }
    Util.extractExtension = extractExtension;
    function replaceWhiteSpaces(str, replaceWith) {
        if (replaceWith === void 0) { replaceWith = '_'; }
        return str.replace(/\s/g, replaceWith);
    }
    Util.replaceWhiteSpaces = replaceWhiteSpaces;
    function getNowDateForFile(justDate) {
        if (justDate === void 0) { justDate = true; }
        var now = new Date();
        return now.getUTCFullYear() + '-' + now.getUTCMonth() + '-' + now.getUTCDate() + (!justDate ? '.' + now.getUTCHours() + '.' + now.getUTCMinutes()
            + '.' + now.getUTCSeconds() + '.' + now.getUTCMilliseconds() : '');
    }
    Util.getNowDateForFile = getNowDateForFile;
    function isExpired(expires) {
        var now = new Date();
        var expiry = new Date(expires);
        return now > expiry;
    }
    Util.isExpired = isExpired;
    function generateExpires(hours) {
        var now = new Date();
        now.setHours(now.getHours() + hours);
        return now.toISOString();
    }
    Util.generateExpires = generateExpires;
    function addArgsTo(properties, args, proto_args) {
        Util.toProtoEntity(properties, args);
        return _.assign({}, proto_args, properties);
    }
    Util.addArgsTo = addArgsTo;
    function generateRandomCaseInsensitive(pattern) {
        return pattern.replace(/[x]/g, function (c) {
            var y = Math.round(Math.random() * 35);
            if (y < 10)
                return y.toString();
            return String.fromCharCode(A + y - 10);
        });
    }
    Util.generateRandomCaseInsensitive = generateRandomCaseInsensitive;
    function generateRandomNumber(pattern) {
        return pattern.replace(/[x]/g, function (c) {
            return Math.round(Math.random() * 9);
        });
    }
    Util.generateRandomNumber = generateRandomNumber;
    function getInstanceUUID(callback) {
        var command = exports.OS_BATCH_RUN_PREFIX + ' dmidecode -t system';
        child_process.exec(command, function (err, stdout, stderr) {
            if (err || !stdout) {
                app_1.logging.error("child processes failed with error code: " +
                    err);
                app_1.logging.info('Attmpting to fetch from file instead...');
                fs.readFile('../uuid', 'ascii', function (err, data) {
                    if (!err) {
                        app_1.logging.info('Found uuid file with code: "' + data + '"');
                        callback(data);
                    }
                    else {
                        app_1.logging.info('Falling back to other less graceful identifiers...');
                        var interfaces = os.networkInterfaces();
                        try {
                            var address = interfaces.Ethernet[0].address;
                            return callback(uuid);
                        }
                        catch (e) { }
                        callback(app_1.duid.getDUID(1)[0]);
                    }
                });
            }
            else {
                var uuid = /UUID: (.*)/.exec(stdout)[1];
                callback(uuid);
            }
        });
    }
    Util.getInstanceUUID = getInstanceUUID;
    function hash(target) {
        var hasher = require('crypto').createHash('md5');
        if (!_.isString(target)) {
            target = _.clone(target);
            delete target.hash;
            target = JSON.stringify(target);
        }
        return hasher.update(target).digest('base64');
    }
    Util.hash = hash;
    function replaceExtension(filePath, new_extension) {
        var y = filePath.split('.');
        y[y.length - 1] = new_extension;
        return y.join('.');
    }
    Util.replaceExtension = replaceExtension;
    function addPreextension(filePath, preextension) {
        var y = filePath.split('.');
        y.splice(y.length - 1, 0, preextension);
        return y.join('.');
    }
    Util.addPreextension = addPreextension;
    function getFileName(link, preextension) {
        var x = _.last(link.split('/'));
        if (!preextension)
            return x;
        return addPreextension(x, preextension);
    }
    Util.getFileName = getFileName;
    function removeQueries(link) {
        var index = link.indexOf('?');
        if (index < 0)
            return link;
        return link.substring(0, index);
    }
    Util.removeQueries = removeQueries;
    function extractNumber(str) {
        var n = str.match("[0-9*]")[1];
        return parseInt(n);
    }
    Util.extractNumber = extractNumber;
    function getIP(req) {
        var ip;
        try {
            ip = req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress;
        }
        catch (e) { }
        ;
        return ip;
    }
    Util.getIP = getIP;
    Util.valueInQuotesRegex = /(["'])(\\?.)*?\1/;
    Util.filter = function (json) {
        while (!filterAux(json))
            ;
    };
    var filterAux = function (json) {
        var noEmptyEntries = true;
        _.forEach(json, function (obj, key) {
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
    };
    function _merge() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return _.merge.apply(_, [{}].concat(args, [function (a, b) {
            if (_.isArray(a)) {
                return a.concat(b);
            }
        }]));
    }
    Util._merge = _merge;
    function merge(dest, src, withOverride) {
        for (var attrname in src) {
            if (!_.isUndefined(src[attrname]) && (withOverride || _.isUndefined(dest[attrname])))
                dest[attrname] = src[attrname];
        }
    }
    Util.merge = merge;
    Util.deepDiffMapper = function () {
        return {
            VALUE_CREATED: 'created',
            VALUE_UPDATED: 'updated',
            VALUE_DELETED: 'deleted',
            VALUE_UNCHANGED: 'unchanged',
            map: function (obj1, obj2) {
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
        };
    }();
    var OBJECT_TYPE = '_object__';
    Util.toProtoEntity = function (properties, json, overwrite) {
        if (overwrite === void 0) { overwrite = false; }
        var keys = Object.keys(json);
        _.forEach(keys, function (key) {
            var value = json[key], valueType, result;
            valueType = getValueType(value);
            if (valueType == 'listValue') {
                var values = _.map(value, function (val) {
                    var valType = getValueType(val);
                    return createAtomEntity(valType, val);
                });
                result = createAtomEntity(valueType, values);
            }
            else
                result = createAtomEntity(valueType, value);
            if (result && (overwrite || !properties[key]))
                properties[key] = result;
        });
    };
    function createAtomEntity(valueType, value) {
        var entry = {};
        if (valueType == OBJECT_TYPE) {
            entry.indexed = false;
            valueType = 'stringValue';
            value = OBJECT_TYPE + JSON.stringify(value);
        }
        entry[valueType] = value;
        return entry;
    }
    Util.fromProtoEntities = function (entityArray, addId) {
        if (addId === void 0) { addId = false; }
        return _.map(entityArray, function (item) {
            return Util.fromProtoEntityWithKey(item.entity);
        });
    };
    Util.fromProtoEntityWithKey = function (entity) {
        var result = Util.fromProtoEntity(entity.properties);
        var key = entity.key;
        var id = _.last(key.path);
        result.id = id.id || id.name;
        result.key = key;
        return result;
    };
    Util.fromProtoEntity = function (properties) {
        var result = new Object();
        _.forEach(properties, function (obj, key) {
            result[key] = convertFrom(obj);
        });
        return result;
    };
    function convertFrom(obj) {
        var key = Object.keys(obj)[0];
        var value = obj[Object.keys(obj)[0]];
        switch (key) {
            case 'stringValue':
                try {
                    if (value.substring(0, OBJECT_TYPE.length) == OBJECT_TYPE)
                        return JSON.parse(value.substring(OBJECT_TYPE.length));
                }
                catch (e) {
                    app_1.logging.error(e);
                    throw e;
                }
            case 'doubleValue':
            case 'integerValue':
            case 'booleanValue':
            case 'dateTimeValue':
                return value;
            case 'listValue':
                return _.map(value, function (item) {
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
                if (_.isArray(value))
                    return 'listValue';
                else
                    return OBJECT_TYPE;
            default:
                throw new Error('Illegal value type while converting to Proto format');
        }
    }
    function postHttps(base_url, path, parameters, callback) {
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
        var post_req = https.request(post_options, function (res) {
            var data = [];
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data.push(chunk);
            });
            res.on('end', function () {
                callback(data);
            });
        });
        // post the data
        post_req.write(post_data);
        post_req.end();
    }
    Util.postHttps = postHttps;
})(Util = exports.Util || (exports.Util = {}));
//# sourceMappingURL=utils.js.map