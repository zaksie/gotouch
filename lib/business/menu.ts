import {logging, gapis, config, client, duid, app} from '../../app';
import {KEY_VALUE_SEPARATOR, Util} from '../service/utils';
import {BUSINESS_KEY} from './business';
import PubSub = require('pubsub-js');
import {MenuMapper} from './menu-mapper';
import {CONST} from '../service/const';
var gm = require('gm');
var util = require('util');
var fs = require('fs');
var async = require('async');
var _ = require('lodash');
var menus = require('../../public/image-map.json');
export const MENU_KEY = 'Menu';
export const MENU_PAGE_KEY = 'MenuPage';
const LOADING_GIF_INSTEAD_OF_PAGES = [{ thumbnail: '/public/images/loading.gif' }];
const DEFAULT_PAGE = {
    zoom: { x: 1, y: 1 },
    start: [0, 0],
    end: [1, 1],
    sections: []
};
export class Menu {
    mapper = new MenuMapper(); 
    constructor() {
        PubSub.subscribe('Datastore.ready', () => {
        });
    }

    fetchFor(placeid, yield_callback, final_callback) {
        async.waterfall([
            (callback) => {
                var gqlQuery = "SELECT * FROM " + MENU_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + BUSINESS_KEY + ", '" + placeid + "')";
                gapis.datastore.runGQLQuery(gqlQuery, callback);
            },
            (results, __ignore__, callback) => {
                let processedResults = Util.fromProtoEntities(results.batch.entityResults);
                if (!processedResults.length) return callback();
                this.queueMenusForFetch(processedResults, yield_callback, callback);
            }], (err, result) => {
                final_callback(err, result);
            });
    }

    siftThrough(entities, callback) {
        let menuEntities = app.business.filterEntitiesFor(entities, MENU_KEY);
        let menus = Util.fromProtoEntities(menuEntities, true);

        let pageEntities = app.business.filterEntitiesFor(entities, MENU_PAGE_KEY);
        let pages = Util.fromProtoEntities(pageEntities, true);
        this.defineMissingPropertiesInPages(pages);

        pages.forEach((page) => {
            let menu = _.find(menus, (m) => {
                return m.name == page.key.path[1].name;
            });
            if (!menu)
                return logging.error('page with key ' + util.inspect(page.key, false, null) + ' has no parent menu');
            menu.pages = (menu.pages || []).concat([page]);
        });

        callback(null, menus);
    }

    isExists(placeid, name, callback) {
        let key = this.constructMenuKey({ placeid: placeid, name: name });
        gapis.datastore.lookup([key], (err, result) => {
            if (result)
                result = result.found.length;
            callback(err, result);
        });
    }

    savePage(page, callback) {
        page.parent_key = this.constructMenuKey(page.details);
        let entity = this.constructMenuPageEntity(page);
        gapis.datastore.update([entity], callback);
    }
    defineMissingPropertiesInPages(pages) {
        _.forEach(pages, (page) => {
            if (!page.sections) page.sections = [];
        });
    }
    /////////////// PRIVATE METHODS ////////////////////
    private queueMenusForFetch(menus, yield_callback, final_callback) {
        var q = async.queue((menu, callback) => {
            this.fetchMenuPages(menu, callback);
        });

        q.drain = () => {
            final_callback(null, menus);
        };

        menus.forEach((menu, index) => {
            q.push(menu, function (err, pages) {
                if (err)
                    logging.error(err);
                else {
                    menu.pages = pages 
                    yield_callback(menu);
                }
            });
        });
    }
    private fetchMenuPages(menu, callback) {
        if (menu.loading) return callback(null, LOADING_GIF_INSTEAD_OF_PAGES);

        var gqlQuery = "SELECT * FROM " + MENU_PAGE_KEY + " WHERE __key__ HAS ANCESTOR KEY(" + BUSINESS_KEY + ", '" + menu.placeid + "',"
            + MENU_KEY + ", '" + menu.name + "')";
        gapis.datastore.runGQLQuery(gqlQuery, (err, results) => {
            if (!err && results.batch.entityResults.length) {
                var pages = Util.fromProtoEntities(results.batch.entityResults, true);
                this.defineMissingPropertiesInPages(pages);
            }
            callback(err, pages);
        });
    }
    
   /////////////////// CREATE MENU /////////////////

    createFromPdf(req, localFilePaths, details, start_callback, final_callback) {
        this.addPlaceholderMenu(details, start_callback);

        var q = async.queue((filepath, callback) => {
            this.breakupPdfIntoPages(filepath, req, details, callback);
        });

        q.drain = () => {
            logging.info('createFromPdf DONE & DONE...');
            let params = _.merge({}, details, { user: req.body.user, loading: false })
            this.upsertMenu(params, final_callback);
        };

        localFilePaths.forEach((filepath) => {
            q.push(filepath, function (err) {
                if (err)
                    logging.error('An error has occured while saving pdf pages:', err);
            });
        });
    }

    breakupPdfIntoPages(filepath, req, details, final_callback) {
        app.pdf.breakupFile(filepath, (err, brokenupFiles) => {
            if (err) return final_callback(err);

            var q = async.queue((params, callback) => {
                this.createMenuPageFromPdf(params, req, details, callback);
            });

            q.drain = final_callback;

            brokenupFiles.forEach((filepath, index) => {
                q.push({
                    filepath: filepath,
                    page_number: index
                }, function (err) {
                    console.log('finished ' + index);
                    if (err)
                        logging.error('An error has occured while saving pdf pages:', err);
                });
            });
        });

    }

    createMenuPageFromPdf(params, req, details, final_callback) {
        logging.info('In createMenuPageFromPdf. Processing: ' + params.filepath);
        let menuMap, parsedText;
        async.waterfall([
            (callback) => {
                logging.info('parsing text...');
                app.pdf.parseText(params.filepath, callback);
            },
            (parsedTextResult, callback) => {
                parsedText = parsedTextResult;
                return callback(null,null);
                //TODO: sort this out: either keep it and prefect it or throw this out.
                // currently the way i'm gonna do it is use the text coordinates from 'parseText' to determine if a text belongs in a certain 'section'/'article'
                // and then figure out it's location relative to the other text elements
                logging.info('creating menu map...');
                try {
                    this.createMenuMap(parsedTextResult, callback);
                }
                catch (e) { callback(e) }
            },
            (menuMapResult, callback) => {
                menuMap = menuMapResult;
                logging.info('converting to image and uploading...');
                try {
                    this.convertPdfToImagePagesAndUpload(req, params.filepath, callback);
                }
                catch (e) { callback(e) }
            },
            (results, callback) => {
                delete parsedText.Pages[0].HLines;
                delete parsedText.Pages[0].VLines;
                delete parsedText.Pages[0].Fills;
                delete parsedText.Pages[0].Fields;
                delete parsedText.Pages[0].Boxsets;

                let mp_params = _.merge(DEFAULT_PAGE, {
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
                logging.info('saving to ds...');
                this.createMenuPageEntity(mp_params, callback);
            }], final_callback);
    } 

    createMenuMap(data, callback) {
        this.mapper.start(data.Pages[0], data, callback);
    }

    convertPdfToImagePagesAndUpload(req, filepath, final_callback) {
        let cloudpath = 'businesses/' + req.body.placeid + '/menus/' + req.body.name + '/';
        let filename = Util.getFileName(filepath).toLowerCase();
        let params = {
            src: filepath,
            dest: cloudpath + filename,
            jpg: true,
            thumbnail: true
        };
        let file;
        async.series([
            (callback) => {
                gapis.storage.upload(filepath, params.dest, callback);
            },
            (callback) => {
                app.graphics.convertAndPipeToCloud(params, callback);
            }], (err, results) => { final_callback(err, results[1]) });
    }

    createMenuPageEntity(params, callback) {
        params.parent_key = this.constructMenuKey(params.details);
        let entity = this.constructMenuPageEntity(params);
        gapis.datastore.insert([entity], callback);
    }

    private constructMenuPageKey(params) {
        return {
            path: params.parent_key.path.concat([{ kind: MENU_PAGE_KEY, name: 'page-' + params.page_number }]),
        };
    }

    private constructMenuPageEntity(params) {
        let key = this.constructMenuPageKey(params);
        return gapis.datastore.constructEntity(key, params)
    }

    private constructMenuKey(params) {
        return {
            path: [{ kind: BUSINESS_KEY, name: params.placeid },
                { kind: MENU_KEY, name: params.name }]
        };
    }
    private constructMenuEntity(params) {
        let key = this.constructMenuKey(params);
        return gapis.datastore.constructEntity(key, params)
    }
    writeToFile(data) {
        data = JSON.stringify(data, null, 2);
        fs.writeFile('menu-map.json', data, (err) => {
            if (err) return logging.error('Error saving locations to local file: ', err)
            logging.info('Data file saved successfully');
        });
    }

    addPlaceholderMenu(details, callback) {
        let params = _.merge({ loading: true }, details);
        this.upsertMenu(params, callback);
    }

    upsertMenu(params, final_callback) {
        let entity = this.constructMenuEntity(params);
        var menu = Util.fromProtoEntity(entity.properties);
        async.waterfall([
            (callback) => {
                gapis.datastore.upsert([entity], callback);
            },
            (__ignore__, __ignore2__, callback) => {
                this.fetchMenuPages(menu, callback);
            },
            (pages, callback) => {
                menu.pages = pages;
                callback(null, menu);
            }], final_callback);
    }
}

