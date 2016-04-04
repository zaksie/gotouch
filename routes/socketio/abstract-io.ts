import {logging, app, cookie} from '../../app';
var async = require('async');

export abstract class SocketIOModule {
    USER_MODULE;
    USER_ROUTE;
    handshake(socket, data) {
        this.USER_MODULE().handshake(socket, data, (err, userobj) => {
            if (userobj.isLoggedIn) {
                socket.emit('user-authenticated', userobj.user);
                this.onAuthenticatedOnHandshake(socket, userobj);
            }
            else
                this.onNotAuthenticatedOnHandshake(socket);
        });
    }

    onNotAuthenticatedOnHandshake(socket) {}
    onAuthenticatedOnHandshake(socket, session) { }

    ensure(socket, name, next, ...args) {
        logging.info('ensuring for function: ' + name);
        var onChecked = (err, isLoggedIn) => {
            if (!(err || !isLoggedIn))
                return next(socket, ...args);

            console.log('ensure FAILED for ' + next.name);
            if (err) this.sendServerError(socket);
            else if (!isLoggedIn) this.send401(socket);
        }

        this.ensureAux(socket, (err, isLoggedIn) => {
            if (err || !isLoggedIn)
                return this.ensureWithPassportInit(socket, onChecked);
            onChecked(err, isLoggedIn);
        });
    }

    linkMe(socket) { }

    init() {
        app.io.of(this.USER_ROUTE).on('connection', (socket) => {
            socket.on('handshake', (data) => {
                this.handshake(socket, data);
            });

            this.initSocket(socket);
        });
    }
    abstract initSocket(socket);
    logError(err) {
        if (err) logging.error(err);
        return !!err;
    }

    ensureAux(socket, callback) {
        var that = this;
        this.USER_MODULE().ensure(socket, (err, userobj) => {
            callback(err, userobj.isLoggedIn);
        });
    }
    ensureWithPassportInit(socket, final_callback) {
        async.series([
            (callback) => {
                socket.request.session.reload(callback);
            },
            (callback) => {
                app.passport_modules.init(socket.request, socket.request.res, callback);
            },
            (callback) => {
                app.passport_modules.session(socket.request, socket.request.res, callback);
            }],
            (err) => {
                if (err) return final_callback(err);
                this.ensureAux(socket, final_callback);
            });
    }
    sendServerError(socket, msg?) {
        socket.emit('server-error');
    }
    send401(socket, msg?) {
        socket.emit('401');
    }
}