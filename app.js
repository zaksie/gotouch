var path = require('path');
var env = require('node-env-file');
env(__dirname + '/.env');
exports.config = module.exports.config = require('./config');
exports.host = require("os").hostname();
var _ = require('lodash');
// ------------- Imports and vars past the .env load point ------------//
var express = require('express');
var gapis_1 = require('./lib/service/gapis');
var order_1 = require('./lib/user/client/order');
var article_1 = require('./lib/business/article');
var order_article_1 = require('./lib/user/client/order-article');
var user_client_1 = require('./lib/user/client/user-client');
var user_pos_1 = require('./lib/user/pos/user-pos');
var user_admin_1 = require('./lib/user/admin/user-admin');
var user_router_1 = require('./lib/user/user-router');
var business_1 = require('./lib/business/business');
var menu_1 = require('./lib/business/menu');
var geolocation_1 = require('./lib/service/geolocation');
var paypal_1 = require('./lib/payment/paypal');
var mailer_1 = require('./lib/service/mailer');
var captcha_1 = require('./lib/service/captcha');
var client_1 = require('./lib/user/client/client');
var pos_1 = require('./lib/user/pos/pos');
var admin_1 = require('./lib/user/admin/admin');
var twilio_1 = require('./lib/service/twilio');
var pdf_1 = require('./lib/service/pdf');
var graphics_1 = require('./lib/service/graphics');
var website_1 = require('./lib/business/website');
var menu_document_1 = require('./lib/business/menu-document');
var image_document_1 = require('./lib/business/image-document');
var uploader_1 = require('./lib/service/uploader');
var socket_io_1 = require('./routes/socketio/socket-io');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
exports.logging = require('./lib/service/logging')();
var session = require('express-session');
var Redis = require('ioredis');
var RedisStore = require('connect-redis')(session);
var helmet = require('helmet');
var compression = require('compression');
exports.passport = require('passport');
var Strategy = require('passport-local').Strategy;
var Duid = exports.config.isProduction ? require('short-duid') : require('short-duid-js');
exports.duid = Duid.init(0, exports.config.duid_salt, 0);
var cluster = require('cluster');
var SocketIO = require('socket.io');
var csrf = require('csurf');
exports.app = express();
exports.gapis = new gapis_1.Google.GAPIs();
exports.client = new client_1.Client();
exports.pos = new pos_1.POS();
exports.admin = new admin_1.Admin();
exports.redis = new Redis();
exports.cookie = session({
    store: new RedisStore({ client: exports.redis }),
    secret: exports.config.cookie.default.secret,
    duration: exports.config.cookie.default.duration,
    secure: exports.config.isProduction,
    httpOnly: true,
    resave: true,
    saveUninitialized: true
});
//cookieName: config.cookie.default.name,
exports.csrfProtection = csrf({ key: exports.config.cookie.default.name });
exports.app.set('trust proxy', true);
exports.app.use(helmet()); //  will include 6 of the 9, leaving out contentSecurityPolicy, hpkp, and noCache.  
exports.app.use(compression({ memLevel: 9, level: 9 }));
// view engine setup
exports.app.set('views', path.join(__dirname, 'views'));
exports.app.set('view engine', 'jade');
// Add the request logger before anything else so that it can
// accurately log requests.
exports.app.use(exports.logging.requestLogger);
// uncomment after placing your favicon in /public
exports.app.use(favicon(__dirname + '/public/favicon.ico'));
exports.app.use(bodyParser.json());
exports.app.use(bodyParser.urlencoded({ extended: false }));
exports.app.use(exports.cookie);
function markAsSeen(req, res, next) {
    markAsSeenAux(req, res, exports.config.cookie.default.name);
    next();
}
function markAsSeenAux(req, res, cookieName) {
    if (!req[cookieName])
        return;
    if (req[cookieName].seenyou) {
        res.setHeader('X-Seen-You', 'true');
    }
    else {
        // setting a property will automatically cause a Set-Cookie response
        // to be sent
        req[cookieName].seenyou = true;
        res.setHeader('X-Seen-You', 'false');
    }
}
exports.app.use(markAsSeen);
exports.app.use('/public', express.static(path.join(__dirname, "public")));
exports.app.use('/node_modules', express.static(path.join(__dirname, "node_modules")));
exports.app.use('/bower_components', express.static(path.join(__dirname, "bower_components")));
exports.app.get('/sw-import.js', function (req, res, next) {
    var options = {
        root: path.join(__dirname, '..')
    };
    res.sendFile('sw-import.js', options);
});
exports.app.use(function (req, res, next) {
    req.user_route = /^\/([^\/]*)/.exec(req.url)[0];
    next();
});
exports.app.uploader = new uploader_1.Uploader();
exports.app.order = new order_1.Order();
exports.app.article = new article_1.Article();
exports.app.orderArticle = new order_article_1.OrderArticle();
exports.app.user = new user_router_1.UserRouter();
exports.app.business = new business_1.Business();
exports.app.menu = new menu_1.Menu();
exports.app.geolocation = new geolocation_1.Geolocation();
exports.app.paypal = new paypal_1.Paypal();
exports.app.mailer = new mailer_1.Mailer();
exports.app.captcha = new captcha_1.Captcha();
exports.app.menu_doc = new menu_document_1.MenuDocument();
exports.app.image_doc = new image_document_1.ImageDocument();
exports.app.website = new website_1.Website([exports.app.menu_doc, exports.app.image_doc]);
exports.app.twilio = new twilio_1.Twilio();
exports.app.pdf = new pdf_1.PDF();
exports.app.graphics = new graphics_1.Graphics();
initPassport();
exports.app.passport_modules = {
    init: exports.passport.initialize(),
    session: exports.passport.session(),
    logout: function (req, res, next) {
        req._logout = function (route, callback) {
            if (!route)
                return callback('_logout used without a route');
            if (route[0] != '/')
                route = '/' + route;
            if (req.user && req.user[route]) {
                delete req.user[route];
                if (!Object.keys(req.user).length)
                    return req.logout();
                req.login(req.user, callback);
            }
            else
                callback('User not logged in');
        };
        next();
    }
};
exports.app.use(exports.app.passport_modules.init);
exports.app.use(exports.app.passport_modules.session);
exports.app.use(exports.app.passport_modules.logout);
var login = require('./routes/user/login');
var router = require('./routes/index');
var adminRouter = require('./routes/user/admin');
var posRouter = require('./routes/user/pos');
var clientRouter = require('./routes/user/client');
var payments = require('./routes/payments');
exports.app.use('/login', login);
exports.app.use(router);
exports.app.use('/admins/access', adminRouter); //because /admins is being used to access the login screen from the browser
exports.app.use('/chefs/access', posRouter); //because /admins is being used to access the login screen from the browser
exports.app.use('/diners/access', clientRouter); //because /admins is being used to access the login screen from the browser
exports.app.use('/payments', payments);
//catch 404 and forward to error handler
exports.app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err['status'] = 404;
    next(err);
});
// error handlers
// development error handler
// will print stacktrace
if (exports.app.get('env') === 'development') {
    exports.app.use(function (err, req, res, next) {
        res.status(err['status'] || 500);
        //res.render('error', {
        //    message: err.message,
        //    error: err
        //});
    });
}
// production error handler
// no stacktraces leaked to user
exports.app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
var server;
exports.app.start = function () {
    // Start the server
    var server = exports.app.listen(exports.config.port, function () {
        var port = server.address().port;
        exports.app.io = SocketIO(server);
        exports.app.io.router = new socket_io_1.MainIO();
        exports.app.io.router.initModules();
        console.log('App listening at http://%s:%s', exports.host, port);
    });
};
function initPassport() {
    var pos_user = exports.app.user.ofType(user_pos_1.POS_USER_ROUTE);
    var client_user = exports.app.user.ofType(user_client_1.CLIENT_USER_ROUTE);
    var admin_user = exports.app.user.ofType(user_admin_1.ADMIN_USER_ROUTE);
    exports.passport.use(user_admin_1.ADMIN_USER_ROUTE, new Strategy({ passReqToCallback: true }, admin_user.authenticate.bind(admin_user)));
    exports.passport.use(user_client_1.CLIENT_USER_ROUTE, new Strategy({ passReqToCallback: true }, client_user.authenticate.bind(client_user)));
    exports.passport.use(user_pos_1.POS_USER_ROUTE, new Strategy({ passReqToCallback: true }, pos_user.authenticate.bind(pos_user)));
    exports.passport.serializeUser(function (user, cb) {
        cb(null, _.map(user, function (u) { return { route: u.route, id: u.id }; }));
    });
    exports.passport.deserializeUser(function (usermap, callback) {
        exports.app.user.find(usermap, callback);
    });
    exports.app.ensureLoggedIn = function (route) {
        return function (req, res, next) {
            if (req.user[route])
                return next();
            res.sendStatus(401);
        };
    };
}
exports.app.start();
//# sourceMappingURL=app.js.map