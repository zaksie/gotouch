import {pos, logging, config, cookie, app} from '../../app';
import {POS_USER_ROUTE} from '../../lib/user/pos/user-pos';
import {SocketIOModule} from './abstract-io';
import PubSub = require('pubsub-js');

export class POSIO extends SocketIOModule {
    USER_ROUTE = POS_USER_ROUTE;
    constructor() {
        super();
        this.USER_MODULE = () => { return pos };
    }
    initSocket(socket) {
        this.handshake(socket, null);
        socket.on('disconnect', () => { pos.onDisconnect.bind(this, socket); });

        socket.on('request-businesses', (location) => { this.ensure(socket, 'emitBusinesses', this.emitBusinesses.bind(this), location) });
        socket.on('request-open-tabs', () => { this.ensure(socket, 'emitOpenOrders', this.emitOpenOrders.bind(this)) });
        socket.on('link-me', () => { this.ensure(socket, 'linkMe', this.linkMe.bind(this)) });

        socket.on('menu-page-save', (page) => { this.ensure(socket, 'saveMenuPage', this.saveMenuPage.bind(this), page) });
    }

    onNotAuthenticatedOnHandshake(socket) { }
    onAuthenticatedOnHandshake(socket, session) {
        this.linkUser(socket, session);
    }

    emitBusinesses(socket, location?) {
        logging.info('in emitBusinesses');
        pos.getBusinessesForSocketId(socket.id, { location: location }, (item) => {
            socket.emit('receive-business', item);
        }, (err) => {
            socket.emit('receive-business-end');
            if (err) return logging.error(err);
        });
    }


    emitOpenOrders(socket) {
        pos.getOpenOrdersForSocketId(socket.id, (item) => {
            socket.emit('receive-open-tab', item);
        }, (err) => {
            socket.emit('receive-open-tab-end');
            if (err) return logging.error(err);
        });
    }
    linkMe(socket) {
        pos.handshake(socket, null, (err, session) => {
            if (!session.isLoggedIn) return;
            this.linkUser(socket, session);
        });
    }

    linkUser(socket, session) {
        let isLinkedAlready = pos.linkConnectionToPlaceIds(socket.id, session);
        if (!isLinkedAlready) {
            logging.info('User linked');
            socket.emit('user-linked');
        }
    }

    emitData(socket, params) {
        logging.info('sending menu to pos...');
        socket.emit(params.message, params.content);
    }

    saveMenuPage(socket, page) {
        app.menu.savePage(page, (err) => { if (err) logging.error(err) });
    }
}