const API_BASE_URL = 'http://localhost:8080/api/batches';

export async function fetchBatchesApi() {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch batches: ${response.statusText}`);
    }
    return response.json();
}

export async function createBatchApi(batchPayload) {
    const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload)
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || `Failed to create batch: ${response.statusText}`);
    }
    return response.json();
}

export async function updateBatchApi(id, batchPayload) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload)
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || `Failed to update batch: ${response.statusText}`);
    }
    return response.json();
}

export async function deleteBatchApi(id) {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || `Failed to delete batch: ${response.statusText}`);
    }
    return true;
}

export async function fetchUnassignedDemandApi() {
    const response = await fetch(`${API_BASE_URL}/unassigned`);
    if (!response.ok) {
        throw new Error(`Failed to fetch unassigned demand: ${response.statusText}`);
    }
    return response.json();
}
