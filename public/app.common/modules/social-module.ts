declare var PubSub, FB;
import {Module} from '../../../public/app.common/modules/module';

export class CommonSocialModule extends Module {
    scope = ['manage_pages'];
    getDefaultLocals() { }
    name() { return 'Social' }
    init() { }
    clearPreviousData() { }
    save() { }
    linkPage() {
        let onFBReady = () => {
            FB.api(
                "/yummlet-pos?fields=access_token",
                (response)=>{
                    if (response && !response.error) {
                        
                    }
                }
            );
        };

        if (typeof FB === 'undefined') {
            window.addEventListener('FacebookAuthenticationOK', () => {
                onFBReady();
            });
            console.log('SCOPE: ' + JSON.stringify(this.scope));
            return PubSub.publish('Activate.fb', [false, this.scope]);
        }

        onFBReady();
    }

}