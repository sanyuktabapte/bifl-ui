const API_BASE_URL = 'http://localhost:8080/api/store-orders';

export const fetchActiveOrders = async () => {
    const response = await fetch(`${API_BASE_URL}/active`);
    if (!response.ok) {
        throw new Error(`Failed to fetch active store orders: ${response.statusText}`);
    }
    return response.json();
};

export const fetchCompletedOrders = async (storeId, startDate, endDate) => {
    const params = new URLSearchParams();
    if (storeId) params.append('storeId', storeId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/completed${queryString}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch completed store orders: ${response.statusText}`);
    }
    return response.json();
};

export const createStoreOrderApi = async (payload) => {
    const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to create store order: ${response.statusText}`);
    }
    return response.json();
};

export const updateStoreOrderApi = async (id, payload) => {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to update store order: ${response.statusText}`);
    }
    return response.json();
};

export const deleteStoreOrderApi = async (id) => {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Failed to delete store order: ${response.statusText}`);
    }
};

export const updateOrderStatusApi = async (id, status) => {
    const response = await fetch(`${API_BASE_URL}/${id}/status?status=${encodeURIComponent(status)}`, {
        method: 'PATCH',
    });
    if (!response.ok) {
        throw new Error(`Failed to update order status: ${response.statusText}`);
    }
    return response.json();
};
