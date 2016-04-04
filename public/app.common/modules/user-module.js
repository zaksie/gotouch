var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_1 = require('../../../public/app.common/modules/module');
var CommonUserModule = (function (_super) {
    __extends(CommonUserModule, _super);
    function CommonUserModule() {
        var _this = this;
        _super.apply(this, arguments);
        this.shouldLoad = { fb: false, google: false };
        this.current = {
            linked: false,
            google: this.initializeGoogle(),
            fb: this.initializeFacebook(),
            local: this.initializeLocal(),
            is: function () { return _this.current.local.is || _this.current.google.is || _this.current.fb.is; },
            image: function () {
                if (_this.current.avatar)
                    return _this.current.avatar;
                else
                    return _this.current.profile().image;
            },
            profile: function () {
                return _this.current.local.profile || _this.current.google.profile || _this.current.fb.profile;
            },
            friendlyHow: function () { return _this.current.local.friendly() || _this.current.google.friendly() || _this.current.fb.friendly(); },
            avatar: null
        };
    }
    CommonUserModule.prototype.getDefaultLocals = function () { };
    CommonUserModule.prototype.name = function () {
        return 'User';
    };
    CommonUserModule.prototype.init = function () {
        this.subscribeToWorker({
            'User.logout': this.logOut.bind(this),
            'User.authenticated': this.onAuthenticated.bind(this),
            'User.linked': this.onUserLinked.bind(this)
        });
    };
    CommonUserModule.prototype.clearPreviousData = function () { };
    CommonUserModule.prototype.hasExpired = function (profile) {
        return !profile.expires || new Date(profile.expires) < new Date();
    };
    CommonUserModule.prototype.refresh = function () {
        this.postMessage('User.handshake');
    };
    CommonUserModule.prototype.save = function () { };
    CommonUserModule.prototype.authenticateSocialLogin = function (profile) {
        var _this = this;
        profile.location = CommonModule.modules.business.location;
        $.post('/login' + CommonModule.ROUTE() + '/social', profile, function (user) {
            if (_this.current[user.how])
                return _this.loggedIn(user);
        }).fail(function (err) {
            PubSub.publish('User.logged.social.fail', err.status);
        });
    };
    CommonUserModule.prototype.loggedIn = function (profile) {
        if (this.current.is())
            return;
        this.current[profile.how].is = true;
        this.current[profile.how].profile = profile;
        PubSub.publish('User.logged.in', profile);
        this.postMessage('User.linkme');
    };
    CommonUserModule.prototype.initializeGoogle = function () {
        var _this = this;
        return { friendly: function () { return _this.current.google.is ? 'Google' : null; }, name: 'google', is: false, profile: null };
    };
    CommonUserModule.prototype.initializeFacebook = function () {
        var _this = this;
        return { friendly: function () { return _this.current.fb.is ? 'Facebook' : null; }, name: 'fb', is: false, profile: null };
    };
    CommonUserModule.prototype.initializeLocal = function () {
        var _this = this;
        return { friendly: function () { return _this.current.local.is ? 'yummlet' : null; }, name: 'local', is: false, profile: null };
    };
    CommonUserModule.prototype.logOut = function () {
        var _this = this;
        if (this.current.google.is) {
            this.loadGoogleIfNecessary(null, function () {
                if (gapi.auth2)
                    gapi.auth2.getAuthInstance().disconnect();
                _this.current.google = _this.initializeGoogle();
            }, true);
        }
        if (this.current.fb.is) {
            this.loadFBIfNecessary(null, function () {
                FB.logout(function () {
                    _this.logOutDone();
                    _this.current.fb = _this.initializeFacebook();
                });
            }, true);
        }
        $.post('/login' + CommonModule.ROUTE() + '/logout', {}, function (response) {
            if (response == "OK") {
                _this.logOutDone();
                _this.current.local = _this.initializeLocal();
            }
        });
    };
    CommonUserModule.prototype.onAuthenticated = function (profile) {
        switch (profile.how) {
            case 'fb':
                this.loadFBIfNecessary(profile, this.loggedIn.bind(this, profile));
                break;
            case 'fb':
                this.loadGoogleIfNecessary(profile, this.loggedIn.bind(this, profile));
                break;
            case 'local':
                break;
            default:
                return;
        }
        this.loggedIn(profile);
    };
    CommonUserModule.prototype.onUserLinked = function () {
        console.log('User linked');
        this.current.linked = true;
        PubSub.publish('User.linked');
    };
    CommonUserModule.prototype.logOutDone = function () {
        this.current.linked = false;
        PubSub.publish('User.logged.out');
    };
    CommonUserModule.prototype.loadFBIfNecessary = function (profile, callback, force) {
        if (typeof FB === 'undefined') {
            if (!force && profile && !this.hasExpired(profile))
                return;
            window.addEventListener('FacebookAuthenticationReady', function () {
                callback();
            });
            this.shouldLoad.fb = true;
            return PubSub.publish('Activate.fb', [true]);
        }
        else
            callback();
    };
    CommonUserModule.prototype.loadGoogleIfNecessary = function (profile, callback, force) {
        if (typeof gapi.auth2 === 'undefined') {
            if (!force && profile && !this.hasExpired(profile))
                return;
            window.addEventListener('GoogleAuthenticationReady', function () {
                callback();
            });
            this.shouldLoad.google = true;
            return PubSub.publish('Activate.google');
        }
        else
            callback();
    };
    return CommonUserModule;
})(module_1.Module);
exports.CommonUserModule = CommonUserModule;
;
//# sourceMappingURL=user-module.js.map