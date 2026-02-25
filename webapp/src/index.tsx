import Plugin from './plugin';
import manifest from './manifest';

declare global {
    interface Window {
        registerPlugin(id: string, plugin: any): void;
    }
}

window.registerPlugin(manifest.id, new Plugin());
