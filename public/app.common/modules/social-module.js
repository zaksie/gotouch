var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var module_1 = require('../../../public/app.common/modules/module');
var CommonSocialModule = (function (_super) {
    __extends(CommonSocialModule, _super);
    function CommonSocialModule() {
        _super.apply(this, arguments);
        this.scope = ['manage_pages'];
    }
    CommonSocialModule.prototype.getDefaultLocals = function () { };
    CommonSocialModule.prototype.name = function () { return 'Social'; };
    CommonSocialModule.prototype.init = function () { };
    CommonSocialModule.prototype.clearPreviousData = function () { };
    CommonSocialModule.prototype.save = function () { };
    CommonSocialModule.prototype.linkPage = function () {
        var onFBReady = function () {
            FB.api("/yummlet-pos?fields=access_token", function (response) {
                if (response && !response.error) {
                }
            });
        };
        if (typeof FB === 'undefined') {
            window.addEventListener('FacebookAuthenticationOK', function () {
                onFBReady();
            });
            console.log('SCOPE: ' + JSON.stringify(this.scope));
            return PubSub.publish('Activate.fb', [false, this.scope]);
        }
        onFBReady();
    };
    return CommonSocialModule;
})(module_1.Module);
exports.CommonSocialModule = CommonSocialModule;
//# sourceMappingURL=social-module.js.map