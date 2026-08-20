const API_BASE_URL = `http://${window.location.hostname}:8080/api/production-planning`;

export const fetchProjection = async () => {
    const response = await fetch(`${API_BASE_URL}/projection`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to fetch projection data: ${response.statusText}`);
    }
    return response.json();
};

export const fetchPlans = async () => {
    const response = await fetch(`${API_BASE_URL}/plans`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Failed to fetch production plans: ${response.statusText}`);
    }
    return response.json();
};

export const generatePlanApi = async (payload) => {
    const response = await fetch(`${API_BASE_URL}/generate-plan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to generate production plan: ${response.statusText}`);
    }
    return response.json();
};

export const updateProductionPlanApi = async (planId, payload) => {
    const response = await fetch(`${API_BASE_URL}/plans/${planId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Failed to update production plan: ${response.statusText}`);
    }
    return response.json();
};

export const updatePlanStatusApi = async (planId, status, items) => {
    const response = await fetch(`${API_BASE_URL}/plans/${planId}/status?status=${encodeURIComponent(status)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
    });
    if (!response.ok) {
        throw new Error(`Failed to update plan status: ${response.statusText}`);
    }
    return response.json();
};

export const deletePlanApi = async (planId) => {
    const response = await fetch(`${API_BASE_URL}/plans/${planId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Failed to delete production plan: ${response.statusText}`);
    }
};

export const updatePlanBatchNumberApi = async (planId, batchNumber) => {
    const response = await fetch(`${API_BASE_URL}/plans/${planId}/batch-number?batchNumber=${encodeURIComponent(batchNumber)}`, {
        method: 'PUT',
    });
    if (!response.ok) {
        throw new Error(`Failed to update batch number: ${response.statusText}`);
    }
    return response.json();
};

export const updateItemBatchNumberApi = async (itemId, oldBatchNumber, newBatchNumber) => {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}/batch-number?oldBatchNumber=${encodeURIComponent(oldBatchNumber)}&newBatchNumber=${encodeURIComponent(newBatchNumber)}`, {
        method: 'PUT',
    });
    if (!response.ok) {
        throw new Error(`Failed to update item batch number: ${response.statusText}`);
    }
    return response.json();
};
