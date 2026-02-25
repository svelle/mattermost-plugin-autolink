import React from 'react';

import reducer from './reducer';
import RHSView from './components/rhs/rhs_view';
import {PLUGIN_ID} from './manifest';

export default class Plugin {
    private rhsRegistration: any;

    initialize(registry: any, store: any) {
        registry.registerReducer(reducer);

        const {toggleRHSPlugin} = registry.registerRightHandSidebarComponent(
            (props: any) => <RHSView {...props} store={store}/>,
            'Autolink',
        );

        this.rhsRegistration = toggleRHSPlugin;

        registry.registerAppBarComponent(
            `/plugins/${PLUGIN_ID}/public/app-bar-icon.svg`,
            () => store.dispatch(toggleRHSPlugin),
            'Autolink',
        );
    }

    uninitialize() {
        // cleanup
    }
}
