var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var business_1 = require('./business');
var PubSub = require('pubsub-js');
var menu_mapper_1 = require('./menu-mapper');
var gm = require('gm');
var util = require('util');
var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var menus = require('../../public/image-map.json');
exports.MENU_KEY = 'Menu';
exports.MENU_PAGE_KEY = 'MenuPage';
var LOADING_GIF_INSTEAD_OF_PAGES = [{ thumbnail: '/public/images/loading.gif' }];
var DEFAULT_PAGE = {
    zoom: { x: 1, y: 1 },
    start: [0, 0],
    end: [1, 1],
    sections: []
};
var Menu = (function () {
    function Menu() {
        this.mapper = new menu_mapper_1.MenuMapper();
        PubSub.subscribe('Datastore.ready', function () {
        });
    }
    Menu.prototype.fetchFor = function (placeid, yield_callback, final_callback) {
        var _this = this;
        async.waterfall([
            function (callback) {
                var gqlQuery = "SELECT * FROM " + exports.MENU_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + business_1.BUSINESS_KEY + ", '" + placeid + "')";
                app_1.gapis.datastore.runGQLQuery(gqlQuery, callback);
            },
            function (results, __ignore__, callback) {
                var processedResults = utils_1.Util.fromProtoEntities(results.batch.entityResults);
                if (!processedResults.length)
                    return callback();
                _this.queueMenusForFetch(processedResults, yield_callback, callback);
            }], function (err, result) {
            final_callback(err, result);
        });
    };
    Menu.prototype.siftThrough = function (entities, callback) {
        var menuEntities = app_1.app.business.filterEntitiesFor(entities, exports.MENU_KEY);
        var menus = utils_1.Util.fromProtoEntities(menuEntities, true);
        var pageEntities = app_1.app.business.filterEntitiesFor(entities, exports.MENU_PAGE_KEY);
        var pages = utils_1.Util.fromProtoEntities(pageEntities, true);
        this.defineMissingPropertiesInPages(pages);
        pages.forEach(function (page) {
            var menu = _.find(menus, function (m) {
                return m.name == page.key.path[1].name;
            });
            if (!menu)
                return app_1.logging.error('page with key ' + util.inspect(page.key, false, null) + ' has no parent menu');
            menu.pages = (menu.pages || []).concat([page]);
        });
        callback(null, menus);
    };
    Menu.prototype.isExists = function (placeid, name, callback) {
        var key = this.constructMenuKey({ placeid: placeid, name: name });
        app_1.gapis.datastore.lookup([key], function (err, result) {
            if (result)
                result = result.found.length;
            callback(err, result);
        });
    };
    Menu.prototype.savePage = function (page, callback) {
        page.parent_key = this.constructMenuKey(page.details);
        var entity = this.constructMenuPageEntity(page);
        app_1.gapis.datastore.update([entity], callback);
    };
    Menu.prototype.defineMissingPropertiesInPages = function (pages) {
        _.forEach(pages, function (page) {
            if (!page.sections)
                page.sections = [];
        });
    };
    /////////////// PRIVATE METHODS ////////////////////
    Menu.prototype.queueMenusForFetch = function (menus, yield_callback, final_callback) {
        var _this = this;
        var q = async.queue(function (menu, callback) {
            _this.fetchMenuPages(menu, callback);
        });
        q.drain = function () {
            final_callback(null, menus);
        };
        menus.forEach(function (menu, index) {
            q.push(menu, function (err, pages) {
                if (err)
                    app_1.logging.error(err);
                else {
                    menu.pages = pages;
                    yield_callback(menu);
                }
            });
        });
    };
    Menu.prototype.fetchMenuPages = function (menu, callback) {
        var _this = this;
        if (menu.loading)
            return callback(null, LOADING_GIF_INSTEAD_OF_PAGES);
        var gqlQuery = "SELECT * FROM " + exports.MENU_PAGE_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + business_1.BUSINESS_KEY + ", '" + menu.placeid + "',"
            + exports.MENU_KEY + ", '" + menu.name + "')";
        app_1.gapis.datastore.runGQLQuery(gqlQuery, function (err, results) {
            if (!err && results.batch.entityResults.length) {
                var pages = utils_1.Util.fromProtoEntities(results.batch.entityResults, true);
                _this.defineMissingPropertiesInPages(pages);
            }
            callback(err, pages);
        });
    };
    /////////////////// CREATE MENU /////////////////
    Menu.prototype.createFromPdf = function (req, localFilePaths, details, start_callback, final_callback) {
        var _this = this;
        this.addPlaceholderMenu(details, start_callback);
        var q = async.queue(function (filepath, callback) {
            _this.breakupPdfIntoPages(filepath, req, details, callback);
        });
        q.drain = function () {
            app_1.logging.info('createFromPdf DONE & DONE...');
            var params = _.merge({}, details, { user: req.body.user, loading: false });
            _this.upsertMenu(params, final_callback);
        };
        localFilePaths.forEach(function (filepath) {
            q.push(filepath, function (err) {
                if (err)
                    app_1.logging.error('An error has occured while saving pdf pages:', err);
            });
        });
    };
    Menu.prototype.breakupPdfIntoPages = function (filepath, req, details, final_callback) {
        var _this = this;
        app_1.app.pdf.breakupFile(filepath, function (err, brokenupFiles) {
            if (err)
                return final_callback(err);
            var q = async.queue(function (params, callback) {
                _this.createMenuPageFromPdf(params, req, details, callback);
            });
            q.drain = final_callback;
            brokenupFiles.forEach(function (filepath, index) {
                q.push({
                    filepath: filepath,
                    page_number: index
                }, function (err) {
                    console.log('finished ' + index);
                    if (err)
                        app_1.logging.error('An error has occured while saving pdf pages:', err);
                });
            });
        });
    };
    Menu.prototype.createMenuPageFromPdf = function (params, req, details, final_callback) {
        var _this = this;
        app_1.logging.info('In createMenuPageFromPdf. Processing: ' + params.filepath);
        var menuMap, parsedText;
        async.waterfall([
            function (callback) {
                app_1.logging.info('parsing text...');
                app_1.app.pdf.parseText(params.filepath, callback);
            },
            function (parsedTextResult, callback) {
                parsedText = parsedTextResult;
                return callback(null, null);
                //TODO: sort this out: either keep it and prefect it or throw this out.
                // currently the way i'm gonna do it is use the text coordinates from 'parseText' to determine if a text belongs in a certain 'section'/'article'
                // and then figure out it's location relative to the other text elements
                app_1.logging.info('creating menu map...');
                try {
                    _this.createMenuMap(parsedTextResult, callback);
                }
                catch (e) {
                    callback(e);
                }
            },
            function (menuMapResult, callback) {
                menuMap = menuMapResult;
                app_1.logging.info('converting to image and uploading...');
                try {
                    _this.convertPdfToImagePagesAndUpload(req, params.filepath, callback);
                }
                catch (e) {
                    callback(e);
                }
            },
            function (results, callback) {
                delete parsedText.Pages[0].HLines;
                delete parsedText.Pages[0].VLines;
                delete parsedText.Pages[0].Fills;
                delete parsedText.Pages[0].Fields;
                delete parsedText.Pages[0].Boxsets;
                var mp_params = _.merge(DEFAULT_PAGE, {
                    //map: menuMap,
                    data: parsedText,
                    pdf: {
                        width: parsedText.Width,
                        height: parsedText.Pages[0].Height,
                    },
                    texts: parsedText.Pages[0].Texts,
                    page_number: params.page_number,
                    details: _.merge({}, details, { user: req.body.user })
                }, results);
                app_1.logging.info('saving to ds...');
                _this.createMenuPageEntity(mp_params, callback);
            }], final_callback);
    };
    Menu.prototype.createMenuMap = function (data, callback) {
        this.mapper.start(data.Pages[0], data, callback);
    };
    Menu.prototype.convertPdfToImagePagesAndUpload = function (req, filepath, final_callback) {
        var cloudpath = 'businesses/' + req.body.placeid + '/menus/' + req.body.name + '/';
        var filename = utils_1.Util.getFileName(filepath).toLowerCase();
        var params = {
            src: filepath,
            dest: cloudpath + filename,
            jpg: true,
            thumbnail: true
        };
        var file;
        async.series([
            function (callback) {
                app_1.gapis.storage.upload(filepath, params.dest, callback);
            },
            function (callback) {
                app_1.app.graphics.convertAndPipeToCloud(params, callback);
            }], function (err, results) { final_callback(err, results[1]); });
    };
    Menu.prototype.createMenuPageEntity = function (params, callback) {
        params.parent_key = this.constructMenuKey(params.details);
        var entity = this.constructMenuPageEntity(params);
        app_1.gapis.datastore.insert([entity], callback);
    };
    Menu.prototype.constructMenuPageKey = function (params) {
        return {
            path: params.parent_key.path.concat([{ kind: exports.MENU_PAGE_KEY, name: 'page-' + params.page_number }]),
        };
    };
    Menu.prototype.constructMenuPageEntity = function (params) {
        var key = this.constructMenuPageKey(params);
        return app_1.gapis.datastore.constructEntity(key, params);
    };
    Menu.prototype.constructMenuKey = function (params) {
        return {
            path: [{ kind: business_1.BUSINESS_KEY, name: params.placeid },
                { kind: exports.MENU_KEY, name: params.name }]
        };
    };
    Menu.prototype.constructMenuEntity = function (params) {
        var key = this.constructMenuKey(params);
        return app_1.gapis.datastore.constructEntity(key, params);
    };
    Menu.prototype.writeToFile = function (data) {
        data = JSON.stringify(data, null, 2);
        fs.writeFile('menu-map.json', data, function (err) {
            if (err)
                return app_1.logging.error('Error saving locations to local file: ', err);
            app_1.logging.info('Data file saved successfully');
        });
    };
    Menu.prototype.addPlaceholderMenu = function (details, callback) {
        var params = _.merge({ loading: true }, details);
        this.upsertMenu(params, callback);
    };
    Menu.prototype.upsertMenu = function (params, final_callback) {
        var _this = this;
        var entity = this.constructMenuEntity(params);
        var menu = utils_1.Util.fromProtoEntity(entity.properties);
        async.waterfall([
            function (callback) {
                app_1.gapis.datastore.upsert([entity], callback);
            },
            function (__ignore__, __ignore2__, callback) {
                _this.fetchMenuPages(menu, callback);
            },
            function (pages, callback) {
                menu.pages = pages;
                callback(null, menu);
            }], final_callback);
    };
    return Menu;
})();
exports.Menu = Menu;
//# sourceMappingURL=menu.js.map