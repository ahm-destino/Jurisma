// Base URL for the API
const BASE_URL = import.meta.env.MODE === 'production'
    ? 'https://jurisma-backend-server.vercel.app/api'
    : 'http://localhost:5000/api';

const getAuthToken = () => {
    return localStorage.getItem('access_token');
};

const apiRequest = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
    }
    return data.data; // Our backend wraps success responses in 'data' dictionary
};

export async function generateLegalContent(prompt) {
    try {
        const response = await apiRequest('/ai/generate', {
            method: 'POST',
            body: JSON.stringify({ prompt })
        });
        return response.text;
    } catch (e) {
        console.error("AI Generation Error", e);
        return "I apologize, but I could not process that legal query. Please check your connection.";
    }
}

export async function vetQuestionAI(question, practiceArea) {
    try {
        const response = await apiRequest('/ai/vet-question', {
            method: 'POST',
            body: JSON.stringify({ question, practiceArea })
        });
        return response; // Backend returns the full JSON { approved, reason, suggestions }
    } catch (error) {
        console.error("AI Vetting Error", error);
        return { approved: false, reason: "AI Service unavailable for vetting. Please try again later.", suggestions: "" };
    }
}

export async function improveQuestionAI(question, practiceArea) {
    try {
        const response = await apiRequest('/ai/improve-question', {
            method: 'POST',
            body: JSON.stringify({ question, practiceArea })
        });
        return response; // Backend returns JSON { suggestions, improved_version }
    } catch (error) {
        console.error("AI Improvement Error", error);
        return { suggestions: ["Ensure your question is specific."], improved_version: question };
    }
}