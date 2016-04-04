import {BusinessModule} from '../../../public/app.common/modules/business-module';
const COLOR_BANK = ['#990000', '#99FF00', '#CC0066', '#CC00FF', '#006633', '#FFFFCC', '#FFFFFF', '#000000'];

export class POSBusinessModule extends BusinessModule {
    current = {};

    getDefaultLocals() {
        return {
            color: (() => {
                let inUse = _.map(this.businesses, (b) => {
                    return b.locals.color;
                });
                return _.find(COLOR_BANK, (color) => {
                    return !_.includes(inUse, color);
                });
            })()
        };
    }


    requestBusinesses(){
        if (!this.controller.modules.user.current.linked) return console.log('Cannot request owned businesses as user is not linked');
        console.log('Requesting owned businesses');
        this.getLocation((err, location) =>{
            super.request(location);
        });
    }

    refresh() {
        this.requestBusinesses();
    }
    save() {
        this.saveAux(this.businesses, 'placeid');
    }
};
