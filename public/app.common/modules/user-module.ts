import {Module} from '../../../public/app.common/modules/module';
declare var PubSub, FB, gapi, CommonModule, $;
export class CommonUserModule extends Module {
    getDefaultLocals() { }
    shouldLoad = { fb: false, google: false };
    name() {
        return 'User';
    }
    current = {
        linked: false,
        google: this.initializeGoogle(),
        fb: this.initializeFacebook(),
        local: this.initializeLocal(),
        is: () => { return this.current.local.is || this.current.google.is || this.current.fb.is },
        image: () => {
            if (this.current.avatar) return this.current.avatar;
            else
                return this.current.profile().image;
        },
        profile: () => {
            return this.current.local.profile || this.current.google.profile || this.current.fb.profile;
        },
        friendlyHow: () => { return this.current.local.friendly() || this.current.google.friendly() || this.current.fb.friendly() },
        avatar: null
    }

    init() {
        this.subscribeToWorker({
            'User.logout': this.logOut.bind(this),
            'User.authenticated': this.onAuthenticated.bind(this),
            'User.linked': this.onUserLinked.bind(this)
        });
    }

    clearPreviousData() { }

    hasExpired(profile) {
        return !profile.expires || new Date(profile.expires) < new Date();
    }

    refresh() {
        this.postMessage('User.handshake');
    }

    save() { }

    authenticateSocialLogin(profile) {
        profile.location = CommonModule.modules.business.location;

        $.post('/login' + CommonModule.ROUTE() + '/social', profile, (user) =>{
            if (this.current[user.how]) //check if how is a legitimate login module (if it exists)
                return this.loggedIn(user);
        }).fail((err) =>{
            PubSub.publish('User.logged.social.fail', err.status);
        });
    }
    loggedIn(profile) {
        if (this.current.is()) return;
        this.current[profile.how].is = true;
        this.current[profile.how].profile = profile;
        PubSub.publish('User.logged.in', profile);
        this.postMessage('User.linkme');
    }

    initializeGoogle(){
        return { friendly: () =>{ return this.current.google.is ? 'Google' : null; }, name: 'google', is: false, profile: null};
    }
    initializeFacebook(){
        return { friendly: () => { return this.current.fb.is ? 'Facebook' : null; }, name: 'fb', is: false, profile: null };
    }
    initializeLocal(){
        return { friendly: () => { return this.current.local.is ? 'yummlet' : null; }, name: 'local', is: false, profile: null };
    }
    logOut(){
        if (this.current.google.is) {
            this.loadGoogleIfNecessary(null, () => {
                if (gapi.auth2)
                    gapi.auth2.getAuthInstance().disconnect();
                this.current.google = this.initializeGoogle();
            }, true);
        }

        if (this.current.fb.is) {
            this.loadFBIfNecessary(null, () => {
                FB.logout(() => {
                    this.logOutDone();
                    this.current.fb = this.initializeFacebook();
                });
            }, true);
        }

        $.post('/login' + CommonModule.ROUTE() + '/logout', {}, (response) =>{
            if (response == "OK") {
                this.logOutDone();
                this.current.local = this.initializeLocal();
            }
        });
    }

    onAuthenticated(profile) {
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
    }
    onUserLinked(){
        console.log('User linked');
        this.current.linked = true;
        PubSub.publish('User.linked');
    }

    logOutDone(){
        this.current.linked = false;
        PubSub.publish('User.logged.out');
    }

    loadFBIfNecessary(profile, callback, force?) {
        if (typeof FB === 'undefined') {
            if (!force && profile && !this.hasExpired(profile)) return;
            window.addEventListener('FacebookAuthenticationReady', () => {
                callback();
            });
            this.shouldLoad.fb = true;
            return PubSub.publish('Activate.fb', [true]);
        }
        else
            callback();
    }

    loadGoogleIfNecessary(profile, callback, force?) {
        if (typeof gapi.auth2 === 'undefined') {
            if (!force && profile && !this.hasExpired(profile)) return;
            window.addEventListener('GoogleAuthenticationReady', () => {
                callback();
            });
            this.shouldLoad.google = true;
            return PubSub.publish('Activate.google');
        }
        else
            callback();
    }
};