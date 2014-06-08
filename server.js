var express = require('express'),
    http = require('http'),
    app = express(),
    db = require('./server/models'),
    passport = require('passport'),
    config = require('./config'),
    moment = require('moment'),
    mailer = require('express-mailer'),
    jade = require('jade'),
    domain = require('domain'),
    paypal = require('paypal-rest-sdk'),
    session = require('express-session'),
    SessionStore = require('express-mysql-session'),
    i18n = require("i18n");

// Configure express app
app.set('port', process.env.PORT || config.port);
app.set('views', __dirname + '/server/views');
app.set('view engine', 'jade');

// Configure paypal
paypal.configure(config.paypal);

// Configure mailer (must be called before "app.use(app.router)")
mailer.extend(app, config.smtp);

// Global error handler
// Note: must be improved to use clusters (see http://nodejs.org/api/domain.html)
function domainWrapper() {
    return function (req, res, next) {
        var reqDomain = domain.create();
        reqDomain.add(req);
        reqDomain.add(res);

        res.on('close', function () {
            reqDomain.dispose();
        });
        reqDomain.on('error', function (err) {
            next(err);
        });
        reqDomain.run(next);
    }
}

// Configure i18n
i18n.configure({
    locales: ['en', 'fr'],
    directory: __dirname + '/server/locales'
});

// Configure session
app.use(express.cookieParser());
app.use(session({
    secret: config.session_secret,
    store: new SessionStore(config.mysql_session)
}));

// Configure the rest of the application
app.use(domainWrapper());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.bodyParser());
app.use(express.static('public'));
app.use(i18n.init);

// Development only configuration
app.configure('development', function () {
    app.use(express.logger('dev'));
    app.use(express.errorHandler());
});

// Configure authentication with passport
require('./server/config/passport')(app, passport);

// Use router (must be declared after passport)
app.use(app.router);

// Init all routes
require('./server/routes')(app, passport);

// Init Sequelize and start server
db
    .sequelize
    .query('SET FOREIGN_KEY_CHECKS = 0')
    .then(function () {
        return db.sequelize.sync({ force: true });
    })
    .then(function () {
        return db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1')
    })
    .then(function () {
        console.log('Database synchronised.');

        // Load sample data in the database
        require('./server/bootstrap-db')(db);

        http.createServer(app).listen(app.get('port'), function () {
            console.log('Express server listening on port ' + app.get('port'))
        })

    }, function (err) {
        console.log(err);
    });


//db
//    .sequelize
//    .sync({ force: true })
//    .complete(function (err) {
//
//
//
//        if (err) {
//            throw err
//        } else {
//            http.createServer(app).listen(app.get('port'), function () {
//                console.log('Express server listening on port ' + app.get('port'))
//            })
//        }
//    });