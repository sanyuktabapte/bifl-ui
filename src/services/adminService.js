const API_BASE_URL = `http://${window.location.hostname}:8080/api/admin`;

export const fetchAdminDashboard = async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard-data`);
    if (!response.ok) {
        throw new Error(`Failed to fetch admin dashboard data: ${response.statusText}`);
    }
    return response.json();
};

export const addStoreApi = async (store) => {
    const response = await fetch(`${API_BASE_URL}/add-store`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(store),
    });
    if (!response.ok) {
        throw new Error(`Failed to add store: ${response.statusText}`);
    }
    return response.json();
};

export const addFlavourApi = async (flavour) => {
    const response = await fetch(`${API_BASE_URL}/add-flavour`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(flavour),
    });
    if (!response.ok) {
        throw new Error(`Failed to add flavour: ${response.statusText}`);
    }
    return response.json();
};

export const updateFlavourApi = async (code, flavour) => {
    const response = await fetch(`${API_BASE_URL}/flavours/${code}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(flavour),
    });
    if (!response.ok) {
        throw new Error(`Failed to update flavour: ${response.statusText}`);
    }
    return response.json();
};

export const updateStoreStatusApi = async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/stores/${id}/status?status=${encodeURIComponent(status)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to update store status: ${response.statusText}`);
    }
    return response.json();
};

export const deleteFlavourApi = async (code) => {
    const response = await fetch(`${API_BASE_URL}/flavours/${code}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Failed to delete flavour: ${response.statusText}`);
    }
};
