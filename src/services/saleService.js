const API_BASE_URL = `http://${window.location.hostname}:8080/api/sales`;

export const fetchAllSaleOrders = async () => {
    const response = await fetch(`${API_BASE_URL}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch all store orders: ${response.statusText}`);
    }
    return response.json();
};

export const completeSaleOrderApi = async (id, payload) => {
    const response = await fetch(`${API_BASE_URL}/${id}/complete`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to complete sale order: ${response.statusText}`);
    }
    return response.json();
};

export const createAndCompleteSaleApi = async (payload) => {
    const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to create sale order: ${response.statusText}`);
    }
    return response.json();
};
