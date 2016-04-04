import {Module} from '../../../public/app.common/modules/module';
var VisualMenu = require('../../../public/app.common/modules/visual-menu-module');

export abstract class MenuModule extends Module {
    visual = VisualMenu();
    getDefaultLocals() { }
    name() { return 'Menu' }
    init() { }
    clearPreviousData() { }
    onFetchReceived(menu) {
        super.onFetchReceived(menu);
        PubSub.publish('Menu.received', menu);
    }

    findParentSection(section, parent_id) {
        if (section.id == parent_id)
            return section;

        if (!section.sections) return false;

        let found;
        _.forEach(section.sections, (s) => {
            found = this.findParentSection(s, parent_id);
            return !found; // break when found != false
        });
        return found;
    }
}