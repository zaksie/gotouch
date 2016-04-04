var app_1 = require('../../app');
var utils_1 = require('../service/utils');
var PubSub = require('pubsub-js');
var async = require('async');
var util = require('util'), fs = require('fs'), _ = require('lodash'), PDFParser = require('pdf2json/pdfparser');
var child_process = require('child_process');
var mkdirp = require('mkdirp');
exports.BURST_FOLDER = 'tmp/pdf-burst/';
var PDF = (function () {
    function PDF() {
        //TODO: check if pdf2json and all dependencies are installed
        app_1.logging.info('PDF Module configured');
        PubSub.publish('PDF.ready', true);
    }
    PDF.prototype.parseText = function (path, callback) {
        var callback_success = function (result) {
            callback(null, result.data);
        };
        var callback_error = function (err) {
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
    };
    PDF.prototype.breakupFile = function (filepath, final_callback) {
        async.waterfall([
            function (callback) {
                var command = utils_1.OS_BATCH_RUN_PREFIX + ' pdftk ' + filepath + ' dump_data';
                app_1.logging.info('Running external command: ' + command);
                child_process.exec(command, function (err, stdout, stderr) {
                    if (err || !stdout)
                        return callback(err || stderr);
                    var pageCount = parseInt(/NumberOfPages: (\d+)/.exec(stdout)[1]);
                    if (!pageCount)
                        return callback('Error reading number of pages');
                    callback(null, pageCount);
                });
            },
            function (pageCount, callback) {
                var output = exports.BURST_FOLDER + app_1.duid.getDUID(1)[0] + '_page_%02d.pdf';
                mkdirp.sync(exports.BURST_FOLDER); //this folder is periodically removed
                var command = utils_1.OS_BATCH_RUN_PREFIX + ' pdftk ' + filepath + ' burst output ' + output;
                app_1.logging.info('Running external command: ' + command);
                child_process.exec(command, function (err, stdout, stderr) {
                    if (err)
                        return callback(err || stderr);
                    var files = [];
                    var i = 1;
                    while (i <= pageCount) {
                        var no = ('0' + (i++).toString()).slice(-2);
                        files.push(output.replace('%02d', no));
                    }
                    callback(null, files);
                });
            }], final_callback);
    };
    return PDF;
})();
exports.PDF = PDF;
//# sourceMappingURL=pdf.js.map