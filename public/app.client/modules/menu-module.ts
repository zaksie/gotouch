import {MenuModule} from '../../../public/app.common/modules/menu-module';


export class ClientMenuModule extends MenuModule { 
    current = {
        placeid: '',
        name: '',
        get: () => {
            let business = this.controller.modules.business.get(this.current.placeid);
            if (!business || !this.current.name) return null;
            return _.find(business.menus, (m) => { return m.name == this.current.name });
        },
        set: (placeid, name) => {
            this.current.placeid = placeid;
            this.current.name = name;
        }
    }
    refresh() { }
    getDefaultLocals() { }
    save() { }
}