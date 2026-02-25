import {PLUGIN_ID} from './manifest';
import {PluginState, Autolink, Submission, UserRole, TestResult} from './types';
import {TAB_REQUESTS} from './constants';

// The plugin state is stored under the key `plugins-{pluginId}` in the Redux store.
const getPluginState = (state: any): PluginState => {
    return state[`plugins-${PLUGIN_ID}`] || {} as PluginState;
};

export const getLinks = (state: any): Autolink[] => getPluginState(state).links || [];
export const getLinksLoading = (state: any): boolean => getPluginState(state).linksLoading || false;
export const getSubmissions = (state: any): Submission[] => getPluginState(state).submissions || [];
export const getSubmissionsLoading = (state: any): boolean => getPluginState(state).submissionsLoading || false;
export const getUserRole = (state: any): UserRole | null => getPluginState(state).userRole || null;
export const getActiveTab = (state: any): string => getPluginState(state).activeTab || TAB_REQUESTS;
export const getEditingLink = (state: any): Autolink | null => getPluginState(state).editingLink || null;
export const getTestResult = (state: any): TestResult | null => getPluginState(state).testResult || null;
export const getError = (state: any): string | null => getPluginState(state).error || null;
export const isAdmin = (state: any): boolean => getUserRole(state)?.is_admin || false;
export const isSubmissionsEnabled = (state: any): boolean => getUserRole(state)?.submissions_enabled || false;
