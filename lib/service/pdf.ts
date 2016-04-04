import {logging, gapis, config, duid, app} from '../../app';
import {Util, OS_BATCH_RUN_PREFIX} from '../service/utils';
import PubSub = require('pubsub-js');
var async = require('async');
var util = require('util'),
    fs = require('fs'),
    _ = require('lodash'),
    PDFParser = require('pdf2json/pdfparser');
var child_process = require('child_process');
var mkdirp = require('mkdirp');

export const BURST_FOLDER = 'tmp/pdf-burst/';
export class PDF {
    constructor() {
        //TODO: check if pdf2json and all dependencies are installed
        logging.info('PDF Module configured');
        PubSub.publish('PDF.ready', true);
    }

    parseText(path, callback) {
        var callback_success = (result) => {
            callback(null, result.data);
        };
        var callback_error = (err) => {
            callback(err);
        };

        var pdfParser = new PDFParser();
        pdfParser.on("pdfParser_dataReady", callback_success.bind(this));
        pdfParser.on("pdfParser_dataError", callback_error.bind(this));

        pdfParser.loadPDF(path);
        // TODO: implement as stream
        // or call directly with buffer
        //fs.readFile(pdfFilePath, function (err, pdfBuffer) {
        //    if (!err) {
        //        pdfParser.parseBuffer(pdfBuffer);
        //    }
        //})
    }

    breakupFile(filepath, final_callback) {
        async.waterfall([
            (callback) => {
                let command = OS_BATCH_RUN_PREFIX + ' pdftk ' + filepath + ' dump_data';
                logging.info('Running external command: ' + command);
                child_process.exec(command, function (err, stdout, stderr) {
                    if (err || !stdout)
                        return callback(err || stderr);
                    let pageCount = parseInt(/NumberOfPages: (\d+)/.exec(stdout)[1]);
                    if (!pageCount) return callback('Error reading number of pages');
                    callback(null, pageCount);
                });
            },
            (pageCount, callback) => {
                let output = BURST_FOLDER + duid.getDUID(1)[0] + '_page_%02d.pdf';
                mkdirp.sync(BURST_FOLDER); //this folder is periodically removed

                let command = OS_BATCH_RUN_PREFIX + ' pdftk ' + filepath + ' burst output ' + output;
                logging.info('Running external command: ' + command);
                child_process.exec(command, (err, stdout, stderr)=> {
                    if (err)
                        return callback(err || stderr);

                    let files = [];
                    let i = 1;
                    while (i <= pageCount) {
                        let no = ('0' + (i++).toString()).slice(-2);
                        files.push(output.replace('%02d', no));
                    }
                    callback(null, files);
                });
            }], final_callback);
    }
}