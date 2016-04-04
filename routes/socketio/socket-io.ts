import {client, logging, config, cookie, app} from '../../app';
import {ClientIO} from './client-io';
import {POSIO} from './pos-io';
import {AdminIO} from './admin-io';
import {Endpoint} from '../../lib/user/endpoint';
import PubSub = require('pubsub-js');
var async = require('async');
var _ = require('lodash');

export class MainIO {
    modules;
    constructor() { this.init(); }
    init() {
        app.io.use(function (socket, next) {
            cookie(socket.request, socket.request.res, next);
        });

        app.io.use(function (socket, next) {
            let cookie = socket.request[config.cookie.default.name];
            if (cookie && cookie.id) return next();
        });

        app.io.use(function (socket, next) {
            app.passport_modules.init(socket.request, socket.request.res, next);
        });
        app.io.use(function (socket, next) {
            app.passport_modules.session(socket.request, socket.request.res, next);
        });
        app.io.use(function (socket, next) {
            app.passport_modules.logout(socket.request, socket.request.res, next);
        });
        app.io.on('connection', (socket) => {
            console.log('Someone connected to root sio');
        });
    }

    initModules() {
        this.modules = {
            admin: new AdminIO(),
            client: new ClientIO(),
            pos: new POSIO()
        };
        _.forEach(this.modules, (m) => {
            m.init();
        });
    }
}
