const API_BASE_URL = `http://${window.location.hostname}:8080/api/sales`;

export const fetchAllSaleOrders = async (status = 'active') => {
    const url = status ? `${API_BASE_URL}?status=${status}` : `${API_BASE_URL}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch sale orders: ${response.statusText}`);
    }
    return response.json();
};

export const fetchCompletedSalesApi = async () => {
    const response = await fetch(`${API_BASE_URL}/completed`);
    if (!response.ok) {
        throw new Error(`Failed to fetch completed sale orders: ${response.statusText}`);
    }
    return response.json();
};

export const fetchDispatchPreviewApi = async (id, payload = null) => {
    const url = `${API_BASE_URL}/orders/${id}/dispatch-preview`;
    const options = payload ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    } : {
        method: 'GET'
    };
    const response = await fetch(url, options);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch dispatch preview: ${response.statusText || response.status}`);
    }
    return response.json();
};

export const dispatchOrderApi = async (id, payload = null) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/dispatch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to dispatch order: ${response.statusText}`);
    }
    return response.json();
};

export const convertToSaleApi = async (id) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/convert-to-sale`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to convert order to sale: ${response.statusText}`);
    }
    return response.json();
};

export const fetchInvoiceApi = async (id) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/invoice`);
    if (!response.ok) {
        throw new Error(`Failed to fetch invoice: ${response.statusText}`);
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
