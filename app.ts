var path = require('path');
var env = require('node-env-file');
env(__dirname + '/.env');
export var config = module.exports.config = require('./config');
export var host = require("os").hostname();
var _ = require('lodash');

// ------------- Imports and vars past the .env load point ------------//
var express = require('express');
import {Google} from './lib/service/gapis';
import {Order} from './lib/user/client/order';
import {Article} from './lib/business/article';
import {OrderArticle} from './lib/user/client/order-article';
import {CLIENT_USER_ROUTE} from './lib/user/client/user-client';
import {POS_USER_ROUTE} from './lib/user/pos/user-pos';
import {ADMIN_USER_ROUTE} from './lib/user/admin/user-admin';
import {UserRouter} from './lib/user/user-router';
import {Business} from './lib/business/business';
import {Menu} from './lib/business/menu';
import {Geolocation} from './lib/service/geolocation';
import {Paypal} from './lib/payment/paypal';
import {Mailer} from './lib/service/mailer';
import {Captcha} from './lib/service/captcha';
import {Client} from './lib/user/client/client';
import {POS} from './lib/user/pos/pos';
import {Admin} from './lib/user/admin/admin';
import {Twilio} from './lib/service/twilio';
import {PDF} from './lib/service/pdf';
import {Graphics} from './lib/service/graphics';
import {Website} from './lib/business/website';
import {MenuDocument} from './lib/business/menu-document';
import {ImageDocument} from './lib/business/image-document';
import {Uploader} from './lib/service/uploader';
import {MainIO} from './routes/socketio/socket-io';
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
export var logging = require('./lib/service/logging')();
var session = require('express-session');
var Redis = require('ioredis');
var RedisStore = require('connect-redis')(session);
var helmet = require('helmet');
var compression = require('compression');
export var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var Duid = config.isProduction ? require('short-duid') : require('short-duid-js');
export var duid = Duid.init(0, config.duid_salt, 0);
var cluster = require('cluster');
var SocketIO = require('socket.io');
var csrf = require('csurf');

export var app = express();
export var gapis = new Google.GAPIs();
export var client = new Client();
export var pos = new POS();
export var admin = new Admin();
export var redis = new Redis();
export var cookie = session({
    store: new RedisStore({ client: redis }),
    secret: config.cookie.default.secret,
    duration: config.cookie.default.duration,
    secure: config.isProduction,
    httpOnly: true,
    resave: true,
    saveUninitialized: true
});

    //cookieName: config.cookie.default.name,

export var csrfProtection = csrf({ key: config.cookie.default.name })

app.set('trust proxy', true);
app.use(helmet()); //  will include 6 of the 9, leaving out contentSecurityPolicy, hpkp, and noCache.  
app.use(compression({ memLevel: 9, level: 9 }));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Add the request logger before anything else so that it can
// accurately log requests.
app.use(logging.requestLogger);

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
    
app.use(cookie);

function markAsSeen(req, res, next) {
    markAsSeenAux(req, res, config.cookie.default.name);
    next();
}

function markAsSeenAux(req, res, cookieName) {
    if (!req[cookieName]) return;

    if (req[cookieName].seenyou) {
        res.setHeader('X-Seen-You', 'true');
    } else {
        // setting a property will automatically cause a Set-Cookie response
        // to be sent
        req[cookieName].seenyou = true;
        res.setHeader('X-Seen-You', 'false');
    }
}

app.use(markAsSeen);

app.use('/public', express.static(path.join(__dirname, "public")));
app.use('/node_modules', express.static(path.join(__dirname, "node_modules")));
app.use('/bower_components', express.static(path.join(__dirname, "bower_components")));
app.get('/sw-import.js', (req, res, next) => {
    let options = {
        root: path.join(__dirname, '..')
    };
    res.sendFile('sw-import.js', options);
});

app.use((req, res, next) => {
    req.user_route = /^\/([^\/]*)/.exec(req.url)[0];
    next();
});

app.uploader = new Uploader();
app.order = new Order();
app.article = new Article();
app.orderArticle = new OrderArticle();
app.user = new UserRouter();
app.business = new Business();
app.menu = new Menu();
app.geolocation = new Geolocation();
app.paypal = new Paypal();
app.mailer = new Mailer();
app.captcha = new Captcha();
app.menu_doc = new MenuDocument();
app.image_doc = new ImageDocument();
app.website = new Website([app.menu_doc, app.image_doc]);
app.twilio = new Twilio();
app.pdf = new PDF();
app.graphics = new Graphics();

initPassport();

app.passport_modules = {
    init: passport.initialize(),
    session: passport.session(),
    logout: (req, res, next) => {
        req._logout = (route, callback) => {
            if (!route) return callback('_logout used without a route');
            if (route[0] != '/')
                route = '/' + route;
            if (req.user && req.user[route]) {
                delete req.user[route];
                if (!Object.keys(req.user).length) return req.logout();

                req.login(req.user, callback);
            }
            else callback('User not logged in');
        };
        next();
    }
};
app.use(app.passport_modules.init);
app.use(app.passport_modules.session);
app.use(app.passport_modules.logout);

var login = require('./routes/user/login');
var router = require('./routes/index');
var adminRouter = require('./routes/user/admin');
var posRouter = require('./routes/user/pos');
var clientRouter = require('./routes/user/client');
var payments = require('./routes/payments');

app.use('/login', login);
app.use(router);
app.use('/admins/access', adminRouter); //because /admins is being used to access the login screen from the browser
app.use('/chefs/access', posRouter); //because /admins is being used to access the login screen from the browser
app.use('/diners/access', clientRouter); //because /admins is being used to access the login screen from the browser
app.use('/payments', payments);

//catch 404 and forward to error handler
app.use((req, res, next) => {
    var err = new Error('Not Found');
    err['status'] = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {

    app.use((err: any, req, res, next) => {
        res.status(err['status'] || 500);
        //res.render('error', {
        //    message: err.message,
        //    error: err
        //});
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err: any, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var server;
app.start = function () {
    // Start the server
    var server = app.listen(config.port, function () {
        var port = server.address().port;
        app.io = SocketIO(server);
        app.io.router = new MainIO();
        app.io.router.initModules();
        console.log('App listening at http://%s:%s', host, port);
    });
}
function initPassport() {
    let pos_user = app.user.ofType(POS_USER_ROUTE);
    let client_user = app.user.ofType(CLIENT_USER_ROUTE)
    let admin_user = app.user.ofType(ADMIN_USER_ROUTE)
    passport.use(ADMIN_USER_ROUTE, new Strategy({ passReqToCallback: true }, admin_user.authenticate.bind(admin_user)));
    passport.use(CLIENT_USER_ROUTE, new Strategy({ passReqToCallback: true }, client_user.authenticate.bind(client_user)));
    passport.use(POS_USER_ROUTE, new Strategy({ passReqToCallback: true }, pos_user.authenticate.bind(pos_user)));

    passport.serializeUser((user, cb) => {
        cb(null, _.map(user, (u) => { return { route: u.route, id: u.id }; }));
    });
    passport.deserializeUser((usermap, callback) => {
        app.user.find(usermap, callback);
    });

    app.ensureLoggedIn = (route) => {
        return (req, res, next) => {
            if (req.user[route])
                return next();
            res.sendStatus(401);
        };
    };
}

app.start();


