import {UserManagerModule} from '../../../public/app.common/modules/user-manager-module';
declare var localStorage;

export class AdminUserManagerModule extends UserManagerModule {
    current = {};

    getDefaultLocals() { }

    init() {
        super.init();
    }

    save() { }
}
