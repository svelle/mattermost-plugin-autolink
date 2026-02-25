import {PLUGIN_ID} from './manifest';
import {Autolink, Submission, TestResult, UserRole} from './types';

const BASE_URL = `/plugins/${PLUGIN_ID}/api/v1`;

function getCsrfToken(): string {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'MMCSRF') {
            return value;
        }
    }
    return '';
}

async function doFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
        ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(BASE_URL + url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const body = await response.json();
            errorMessage = body.error || errorMessage;
        } catch {
            // ignore parse errors
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

class Client {
    // Links
    getLinks(): Promise<Autolink[]> {
        return doFetch<Autolink[]>('/links');
    }

    createOrUpdateLink(link: Autolink): Promise<{status: string}> {
        return doFetch<{status: string}>('/link', {
            method: 'POST',
            body: JSON.stringify(link),
        });
    }

    deleteLink(name: string): Promise<{status: string}> {
        return doFetch<{status: string}>('/link', {
            method: 'DELETE',
            body: JSON.stringify({name}),
        });
    }

    testLink(pattern: string, template: string, sampleText: string, wordMatch: boolean): Promise<TestResult> {
        return doFetch<TestResult>('/link/test', {
            method: 'POST',
            body: JSON.stringify({
                pattern,
                template,
                word_match: wordMatch,
                sample_text: sampleText,
            }),
        });
    }

    // User role
    getUserRole(): Promise<UserRole> {
        return doFetch<UserRole>('/user/role');
    }

    // Submissions
    getSubmissions(status?: string): Promise<Submission[]> {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return doFetch<Submission[]>(`/submissions${query}`);
    }

    createSubmission(description: string, pattern?: string, template?: string): Promise<Submission> {
        return doFetch<Submission>('/submissions', {
            method: 'POST',
            body: JSON.stringify({description, pattern, template}),
        });
    }

    updateSubmission(id: string, status: string, statusNote?: string): Promise<Submission> {
        return doFetch<Submission>(`/submissions/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify({status, status_note: statusNote || ''}),
        });
    }
}

const client = new Client();
export default client;
