export interface Autolink {
    Name: string;
    Disabled: boolean;
    Pattern: string;
    Template: string;
    Scope: string[];
    WordMatch: boolean;
    DisableNonWordPrefix: boolean;
    DisableNonWordSuffix: boolean;
    ProcessBotPosts: boolean;
}

export interface Submission {
    id: string;
    user_id: string;
    username: string;
    submitted_at: number;
    description: string;
    pattern: string;
    template: string;
    status: 'pending' | 'implemented' | 'rejected';
    status_note: string;
}

export interface TestResult {
    input: string;
    output: string;
    error?: string;
}

export interface UserRole {
    is_admin: boolean;
    submissions_enabled: boolean;
}

export interface PluginState {
    links: Autolink[];
    linksLoading: boolean;
    submissions: Submission[];
    submissionsLoading: boolean;
    userRole: UserRole | null;
    activeTab: string;
    editingLink: Autolink | null;
    testResult: TestResult | null;
    error: string | null;
}
