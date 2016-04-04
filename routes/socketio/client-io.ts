import {client, logging, config, cookie, app} from '../../app';
import {CLIENT_USER_ROUTE} from '../../lib/user/client/user-client';
import {SocketIOModule} from './abstract-io';
import PubSub = require('pubsub-js');

export class ClientIO extends SocketIOModule {
    //userModule() { return client }; // unfortunately this cannot be done yet in TS
    USER_ROUTE = CLIENT_USER_ROUTE;
    constructor() {
        super();
        this.USER_MODULE = () => { return client };
    }
    initSocket(socket) {
        this.handshake(socket, null);
        socket.on('request-businesses', this.onRequestBusinesses.bind(this, socket));

        socket.on('tab-add-article', (data) => {
            client.addArticleToOrder(socket, data.business, data.article);
        });
        socket.on('tab-remove-article', (data) => {
            client.removeArticleFromOrder(socket, data.business, data.article);
        });

        socket.on('order-open-create', (data) => {
            client.openOrCreateOrderByBusiness(socket, data, orderOpened);
        });

        socket.on('order-request', () => {
            client.openRecentOrder(socket, orderOpened);
        });

        socket.on('order-update', (data) => {
            client.updateOrder(socket, data);
        });

        function orderOpened(data) {
            socket.emit('order-receive', data);
        }
    }

    onRequestBusinesses(socket, params) {
        if (params.placeid) {
            logging.info('Client requesting single complete business...');
            return this.emitBusiness(socket, params);
        }

        logging.info('Client requesting nearby businesses...');

        client.getPlaces(socket, params, (item) => {
            socket.emit('receive-business', item);
        }, (err) => {
            if (this.logError(err))
                socket.emit('receive-business-error');
            else
                socket.emit('receive-business-end');
        });
    }

    emitBusiness(socket, params) {
        client.getBusiness(socket, params, (err, result) => {
            if (!this.logError(err))
                socket.emit('receive-business', result);
        });
    }
}