const API_BASE_URL = `http://${window.location.hostname}:8080/api/internal-transfers`;

export const fetchAllTransfers = async () => {
    const response = await fetch(`${API_BASE_URL}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch transfers: ${response.statusText}`);
    }
    return response.json();
};

export const executeTransferApi = async (payload) => {
    const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to execute transfer: ${response.statusText}`);
    }
    return response.json();
};

export const deleteTransferApi = async (id) => {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to delete transfer: ${response.statusText}`);
    }
    return true;
};
