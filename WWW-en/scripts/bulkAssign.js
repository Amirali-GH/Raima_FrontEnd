import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';
import { loadBranchesInLeads } from './leads.js';

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

// Array of colors for different boxes
const BOX_COLORS = [
    { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', count: 'text-purple-700', icon: 'text-purple-600' },
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', count: 'text-blue-700', icon: 'text-blue-600' },
    { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', count: 'text-green-700', icon: 'text-green-600' },
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', count: 'text-orange-700', icon: 'text-orange-600' },
    { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', count: 'text-red-700', icon: 'text-red-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', count: 'text-indigo-700', icon: 'text-indigo-600' },
    { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', count: 'text-yellow-700', icon: 'text-yellow-600' }
];

// function to get unallocated data from API
export async function fetchUnassignedNumbers(sourceId = '0') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('Please login first');
        }

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/info/notassignment?sourceid=${sourceId}`, 
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Error receiving data: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            return data.data || [];
        } else {
            throw new Error(data.meta?.description || 'Error receiving data from the server');
        }
    } catch (error) {
        console.error('Error fetching unassigned numbers:', error);
        throw error;
    }
}

// Function to create dynamic boxes based on data API
export function createDynamicCountBoxes(data, selectedSourceId = '0') {
    const container = document.getElementById('dynamic-counts-container');
    if (!container) return;

    // Delete previous content
    container.innerHTML = '';

    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-4">
                <i class="material-icons text-4xl mb-2">info</i>
                <p>No data found</p>
            </div>
        `;
        return;
    }

    // If all sources are selected, show all boxes
    const sourcesToShow = selectedSourceId === '0' 
        ? data 
        : data.filter(item => item.sourceid == selectedSourceId);

    if (sourcesToShow.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-4">
                <i class="material-icons text-4xl mb-2">search_off</i>
                <p>No data found for the selected resource</p>
            </div>
        `;
        return;
    }

    // Create boxes for each resource
    sourcesToShow.forEach((source, index) => {
        const colorIndex = index % BOX_COLORS.length;
        const color = BOX_COLORS[colorIndex];
        
        const box = document.createElement('div');
        box.className = `${color.bg} p-4 rounded-lg border ${color.border} transition-all duration-300 hover:shadow-md`;
        box.innerHTML = `
            <div class="flex items-center">
                <i class="material-icons ${color.icon} mr-2">source</i>
                <span class="text-sm ${color.text} font-medium">${source.sourcename || 'Unknown source'}</span>
            </div>
            <div class="text-xl font-bold ${color.count} mt-2">${formatNumber(source.count || 0)}</div>
            <div class="text-xs ${color.text} opacity-75 mt-1">ID: ${source.sourceid}</div>
        `;
        container.appendChild(box);
    });

    // Add a grand total box if all sources are displayed
    if (selectedSourceId === '0') {
        const totalCount = data.reduce((sum, item) => sum + (item.count || 0), 0);
        const totalBox = document.createElement('div');
        totalBox.className = 'bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-lg text-white col-span-full md:col-span-2 lg:col-span-1';
        totalBox.innerHTML = `
            <div class="flex items-center">
                <i class="material-icons text-white mr-2">summarize</i>
                <span class="text-sm font-medium">Sum of all resources</span>
            </div>
            <div class="text-2xl font-bold mt-2">${formatNumber(totalCount)}</div>
            <div class="text-xs opacity-90 mt-1">Total number of unassigned numbersdiv>
        `;
        container.appendChild(totalBox);
    }
}

// Function to open assignment modal - modified version
export async function openAssignmentModal(assignmentId = null) {
    const modal = document.getElementById('assignment-modal');
    const title = document.getElementById('assignment-modal-title');
    const form = document.getElementById('assignment-form');
    const branchSelect = document.getElementById('assignment-branch');

    // Wait for branches to load
    try {
        await loadBranchesInLeads(); // Now with await we will wait
    } catch (error) {
        console.error('Error loading branches:', error);
        showNotification('Error loading branch list', 'error');
        return;
    }

    // to fill dropdown Branches
    branchSelect.innerHTML = '<option value="">Choose a branch...</option>';
    if (currentState.branches && Array.isArray(currentState.branches)) {
        currentState.branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.branchid;
            option.textContent = branch.mainname;
            branchSelect.appendChild(option);
        });
    }

    if (assignmentId) {
        // --- Edit mode ---
        title.textContent = 'Edit assignment';
        try {
            const apiBaseUrl = window.location.origin;
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('The desired assignment was not found');
            
            const result = await response.json();
            const assignment = result.data;
            
            document.getElementById('assignment-id').value = assignment.assignmentid;
            document.getElementById('assignment-phone').value = assignment.phone || '';
            document.getElementById('assignment-username').value = assignment.username || '';
            branchSelect.value = assignment.branchid || '';
        } catch (error) {
            showNotification('Error in receiving information for editing: ' + error.message, 'error');
            return;
        }
    } else {
        // --- add mode ---
        title.textContent = 'Add new number';
        form.reset();
        document.getElementById('assignment-id').value = '';
    }

    // modal display
    modal.classList.remove('hidden');

    // add event listener To close the modal
    setupModalCloseListeners();
}

// Function to set event listenerModal closures
function setupModalCloseListeners() {
    const modal = document.getElementById('assignment-modal');
    const closeButtons = modal.querySelectorAll('.close-modal-btn');
    const cancelButton = modal.querySelector('button[type="button"]');
    
    // Modal closure function
    const closeModal = () => {
        modal.classList.add('hidden');
    };

    // add event listener to all close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });

    // Close the modal by clicking outside of it
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Close the modal with the key Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // If there is a separate cancel button
    if (cancelButton) {
        cancelButton.addEventListener('click', closeModal);
    }
}

// Function to manage the modal form
function setupAssignmentFormListener() {
    const form = document.getElementById('assignment-form');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await handleAssignmentFormSubmit();
        });
    }
}

// Function to submit the form
async function handleAssignmentFormSubmit() {
    try {
        const form = document.getElementById('assignment-form');
        const assignmentId = document.getElementById('assignment-id').value;
        const phone = document.getElementById('assignment-phone').value;
        const username = document.getElementById('assignment-username').value;
        const branchId = document.getElementById('assignment-branch').value;

        // Validation
        if (!phone || !branchId) {
            showNotification('It is mandatory to fill in the contact number and branch fields', 'error');
            return;
        }

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('Please login first', 'error');
            return;
        }

        const requestData = {
            phone: phone,
            username: username || null,
            branchid: parseInt(branchId),
            sourcecollectingdataid: parseInt(3)
        };

        let url = `${apiBaseUrl}/api/v1/phoneassignment`;
        let method = 'POST';

        // If we are editing
        if (assignmentId) {
            url = `${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}`;
            method = 'PUT';
            requestData.remove(sourcecollectingdataid)
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `error in ${assignmentId ? 'Edit' : 'Add'} Allocation`);
        }

        const result = await response.json();
        
        if (result.meta && result.meta.is_success) {
            showNotification(result.meta.description || `Allocation successfully ${assignmentId ? 'Edit' : 'Add'} became`, 'success');
            
            // Close the modal
            document.getElementById('assignment-modal').classList.add('hidden');
            
            // Update data
            await loadBulkAssignmentData();
        } else {
            throw new Error(result.meta?.description || `error in ${assignmentId ? 'Edit' : 'Add'} Allocation`);
        }

    } catch (error) {
        console.error('Error submitting assignment form:', error);
        showNotification(error.message, 'error');
    }
}


// Main function to update boxes
export async function updateUnassignedCountsBoxes(sourceId = '0') {
    try {
        const data = await fetchUnassignedNumbers(sourceId);
        currentState.unassignedNumbers = data; // Save data in state
        createDynamicCountBoxes(data, sourceId);
    } catch (error) {
        console.error('Error updating counts boxes:', error);
        showErrorState();
    }
}

// Function to display the error state
function showErrorState() {
    const container = document.getElementById('dynamic-counts-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-4">
                <i class="material-icons text-4xl mb-2">error</i>
                <p>Error loading data</p>
                <button onclick="window.updateUnassignedCountsBoxesRetry()" class="text-blue-500 hover:text-blue-700 mt-2">
                    <i class="material-icons text-sm mr-1">refresh</i>
                    try again
                </button>
            </div>
        `;
    }
}

// Function to fill dropdown Resources
export async function populateSourceFilter() {
    try {
        await loadBranchesForBulkAssignment();
        const data = await fetchUnassignedNumbers('0');
        const sourceFilter = document.getElementById('source-filter');
        
        if (!sourceFilter || !data) return;
        
        // Save the current value
        const currentValue = sourceFilter.value;
        
        // Clear and refill
        sourceFilter.innerHTML = '<option value="0">all resources</option>';
        
        data.forEach(source => {
            if (source.sourceid && source.sourcename) {
                const option = document.createElement('option');
                option.value = source.sourceid;
                option.textContent = `${source.sourcename} (${formatNumber(source.count)})`;
                sourceFilter.appendChild(option);
            }
        });
        
        // Returns the previous value if any
        if (currentValue && Array.from(sourceFilter.options).some(opt => opt.value === currentValue)) {
            sourceFilter.value = currentValue;
        }
        
    } catch (error) {
        console.error('Error populating source filter:', error);
    }
}

// Function to manage source change
export function setupSourceFilterListener() {
    const sourceFilter = document.getElementById('source-filter');
    
    if (sourceFilter) {
        sourceFilter.addEventListener('change', async function(e) {
            const selectedSourceId = e.target.value;
            await updateUnassignedCountsBoxes(selectedSourceId);
            await updateAssignmentSummary(selectedSourceId);
        });
    }
}

export async function loadBulkAssignmentData() {
    try {
        // Show loading mode
        showLoadingState();
        
        // Parallel loading of data
        await Promise.all([
            populateSourceFilter(),
            updateUnassignedCountsBoxes('0'),
            updateAssignmentSummary('0')
        ]);
        
    } catch (error) {
        console.error('Error loading bulk assignment data:', error);
        showNotification('Error loading group assignment data', 'error');
    }
}

// Function to display the loading mode
function showLoadingState() {
    const container = document.getElementById('dynamic-counts-container');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center text-gray-500 py-8">
                <div class="spinner"></div>
                <p class="mt-2">Loading data...</p>
            </div>
        `;
    }
}

// continued global To fix the problem onclick
window.updateUnassignedCountsBoxesRetry = function() {
    updateUnassignedCountsBoxes('0');
};

// Function to get summary of branch allocations
export async function fetchBranchAssignmentSummary(sourceId = '0') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('Please login first');
        }

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/info/branchassignment?sourceid=${sourceId}`, 
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Error receiving data: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            return data.data || [];
        } else {
            throw new Error(data.meta?.description || 'Error receiving data from the server');
        }
    } catch (error) {
        console.error('Error fetching branch assignment summary:', error);
        throw error;
    }
}

// Function to create assignment summary cards
export function createAssignmentSummaryCards(data) {
    const summaryContainer = document.getElementById('assignment-summary');
    if (!summaryContainer) return;

    // Delete previous content
    summaryContainer.innerHTML = '';

    if (!data || data.length === 0) {
        summaryContainer.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="material-icons text-4xl mb-2">assignment</i>
                <p>There is no data to display</p>
            </div>
        `;
        return;
    }

    // Calculation of totals
    const totals = {
        totalAssigned: data.reduce((sum, item) => sum + (item.totalassigned || 0), 0),
        assignedLastHour: data.reduce((sum, item) => sum + (item.assignedlasthour || 0), 0),
        calledCount: data.reduce((sum, item) => sum + (item.calledcount || 0), 0),
        notCalledCount: data.reduce((sum, item) => sum + (item.notcalledcount || 0), 0)
    };

    // Create a general summary card
    const overallCard = document.createElement('div');
    overallCard.className = 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-6 mb-6 shadow-lg';
    overallCard.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">General summary of allocations</h3>
            <i class="material-icons text-2xl">summarize</i>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.totalAssigned)}</div>
                <div class="text-sm opacity-90">total allocations</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.assignedLastHour)}</div>
                <div class="text-sm opacity-90">last hour allocation</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.calledCount)}</div>
                <div class="text-sm opacity-90">called</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">${formatNumber(totals.notCalledCount)}</div>
                <div class="text-sm opacity-90">not called</div>
            </div>
        </div>
    `;
    summaryContainer.appendChild(overallCard);

    // Create cards for each branch
    data.forEach(branch => {
        const completionRate = branch.totalassigned > 0 
            ? Math.round((branch.calledcount / branch.totalassigned) * 100) 
            : 0;

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-5 mb-4 border-l-4 border-purple-500 hover:shadow-lg transition-shadow duration-300';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-semibold text-gray-800 text-lg">${branch.branchname || 'no name'}</h4>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                    <div class="text-blue-600 font-bold text-xl">${formatNumber(branch.totalassigned || 0)}</div>
                    <div class="text-blue-800 text-xs mt-1">total allocations</div>
                </div>
                <div class="text-center p-3 bg-green-50 rounded-lg">
                    <div class="text-green-600 font-bold text-xl">${formatNumber(branch.assignedlasthour || 0)}</div>
                    <div class="text-green-800 text-xs mt-1">last hour allocation</div>
                </div>
                <div class="text-center p-3 bg-emerald-50 rounded-lg">
                    <div class="text-emerald-600 font-bold text-xl">${formatNumber(branch.calledcount || 0)}</div>
                    <div class="text-emerald-800 text-xs mt-1">called</div>
                </div>
                <div class="text-center p-3 bg-amber-50 rounded-lg">
                    <div class="text-amber-600 font-bold text-xl">${formatNumber(branch.notcalledcount || 0)}</div>
                    <div class="text-amber-800 text-xs mt-1">not called</div>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-600">
                <span>Call completion rate:span>
                <span class="font-semibold ${completionRate >= 80 ? 'text-green-600' : completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}">
                    ${completionRate}%
                </span>
            </div>
            
            ${branch.totalassigned > 0 ? `
            <div class="mt-2 bg-gray-200 rounded-full h-2">
                <div class="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                     style="width: ${completionRate}%"></div>
            </div>
            ` : ''}
        `;
        summaryContainer.appendChild(card);
    });
}

// Main function to update the allocations summary
export async function updateAssignmentSummary(sourceId = '0') {
    try {
        const data = await fetchBranchAssignmentSummary(sourceId);
        createAssignmentSummaryCards(data);
    } catch (error) {
        console.error('Error updating assignment summary:', error);
        showErrorStateSummary();
    }
}

// Function to display error status in allocations summary
function showErrorStateSummary() {
    const summaryContainer = document.getElementById('assignment-summary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="material-icons text-4xl mb-2">error</i>
                <p>Error loading allocation summary data</p>
                <button onclick="window.updateAssignmentSummaryRetry()" class="text-blue-500 hover:text-blue-700 mt-2 flex items-center justify-center mx-auto">
                    <i class="material-icons text-sm ml-1">refresh</i>
                    try again
                </button>
            </div>
        `;
    }
}

// continued global To fix the problem onclick
window.updateAssignmentSummaryRetry = function() {
    const sourceFilter = document.getElementById('source-filter');
    const sourceId = sourceFilter ? sourceFilter.value : '0';
    updateAssignmentSummary(sourceId);
};

// Load branches for group assignment
export async function loadBranchesForBulkAssignment() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('Please login first', 'error');
            return;
        }

        // Receive branch data from API
        const response = await fetch(`${apiBaseUrl}/api/v1/branch?page=1&status=active`, {
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            }
        });

        if (!response.ok) {
            throw new Error(`Error in receiving branches: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.meta.is_success || !data.data || !Array.isArray(data.data)) {
            throw new Error('The received data structure is invalid');
        }

        const branches = data.data;
        const tbody = document.getElementById('branches-table-body');
        
        if (tbody) {
            tbody.innerHTML = '';
            
            branches.forEach(branch => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 transition-colors';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        <div class="font-medium">${branch.mainname || 'no name'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${branch.assignedCount || 0}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                        <input type="number" min="0" 
                               class="assignment-count-input w-24 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                               data-branch-id="${branch.branchid}"
                               data-branch-name="${branch.mainname}"
                               value="0"
                               oninput="validateAssignmentInput(this)">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <button class="text-red-600 hover:text-red-900 clear-branch-btn p-1 rounded-full hover:bg-red-50 transition-colors" 
                                data-branch-id="${branch.branchid}"
                                title="clear allocation">
                            <i class="material-icons text-base">clear</i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Add event to delete buttons
            document.querySelectorAll('.clear-branch-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const branchId = this.getAttribute('data-branch-id');
                    const branchName = this.closest('tr').querySelector('td:first-child .font-medium').textContent;
                    clearBranchAssignment(branchId, branchName);
                });
            });
            
            // Add event to count fields
            document.querySelectorAll('.assignment-count-input').forEach(input => {
                input.addEventListener('input', updateTotalRequestedCount);
                input.addEventListener('change', updateAssignmentSummary);
            });
            
            updateTotalRequestedCount();
            updateAssignmentSummary();
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        showNotification('Error loading branch list: ' + error.message, 'error');
        
        // Display the error mode in the table
        const tbody = document.getElementById('branches-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-red-500">
                        <i class="material-icons text-4xl mb-2">error</i>
                        <div>Error loading data</div>
                        <button onclick="loadBranchesForBulkAssignment()" class="mt-2 text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto">
                            <i class="material-icons text-sm ml-1">refresh</i>
                            try again
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// Function to validate input of allocation number
export function validateAssignmentInput(input) {
    const value = parseInt(input.value);
    if (value < 0) {
        input.value = 0;
    }
    
    // Update summary as you type
    updateTotalRequestedCount();
}

// continued global To fix the problem onclick
window.loadBranchesForBulkAssignment = loadBranchesForBulkAssignment;

// Function to clear the assignment of a specific branch
export function clearBranchAssignment(branchId) {
    const input = document.querySelector(`.assignment-count-input[data-branch-id="${branchId}"]`);
    if (input) {
        const branchName = input.closest('tr').querySelector('td:first-child').textContent;
        input.value = 0;
        updateTotalRequestedCount();
        updateAssignmentSummary();
        showNotification(`Branch allocations ${branchName} cleared`, 'info');
    }
}

// Function to update the requested total count
export function updateTotalRequestedCount() {
    let total = 0;
    document.querySelectorAll('.assignment-count-input').forEach(input => {
        total += parseInt(input.value) || 0;
    });
}

// Function for equal allocation between branches
export function distributeEqually() {
    try {
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? sourceFilter.value : '0';
        
        if (!currentState.unassignedNumbers || currentState.unassignedNumbers.length === 0) {
            showNotification('Please wait while the data is loaded.', 'warning');
            return;
        }

        const totalUnassigned = getTotalUnassignedCount(sourceId);
        
        if (totalUnassigned === 0) {
            showNotification('There are no numbers available for allocation.', 'warning');
            return;
        }

        const inputs = document.querySelectorAll('.assignment-count-input');
        if (inputs.length === 0) {
            showNotification('There are no branches to allocate.', 'warning');
            return;
        }

        // Calculate equal number for each branch
        const equalCount = Math.floor(totalUnassigned / inputs.length);
        const remainder = totalUnassigned % inputs.length;
        
        // Equal allocation considering the remainder
        inputs.forEach((input, index) => {
            const count = index < remainder ? equalCount + 1 : equalCount;
            input.value = count;
        });

        updateTotalRequestedCount();
        updateAssignmentSummary();
        
        showNotification(`number ${formatNumber(totalUnassigned)} Number equally between ${inputs.length} The branch was assigned.`, 'success');
        
    } catch (error) {
        console.error('Error in equal distribution:', error);
        showNotification('Error in equal assignment: ' + error.message, 'error');
    }
}

function getTotalUnassignedCount(sourceId = '0') {
    if (!currentState.unassignedNumbers) return 0;
    
    if (sourceId === '0') {
        // Sum of all resources
        return currentState.unassignedNumbers.reduce((sum, item) => sum + (item.count || 0), 0);
    } else {
        // Only selected source
        const source = currentState.unassignedNumbers.find(item => item.sourceid == sourceId);
        return source ? source.count || 0 : 0;
    }
}


// Function to clear all allocations
export function clearAllAssignments() {
    document.querySelectorAll('.assignment-count-input').forEach(input => {
        input.value = 0;
    });
    
    updateTotalRequestedCount();
    updateAssignmentSummary();
    showNotification('All assignments are cleared', 'info');
}

// Function to get branch name based on ID
function getBranchName(branchId) {
    if (!currentState.branches || !Array.isArray(currentState.branches)) {
        return `branch ${branchId}`;
    }
    
    const branch = currentState.branches.find(b => b.branchid === branchId);
    return branch ? branch.mainname : `branch ${branchId}`;
}

// Add functions global To fix the problem onclick
window.distributeEqually = distributeEqually;
window.saveAssignments = saveAssignments;

// Function to store allocations
export async function saveAssignments() {
    try {
        // collect branch_ids and counts
        const branchIds = [];
        const counts = [];
        
        const inputs = document.querySelectorAll('.assignment-count-input');
        inputs.forEach(input => {
            const branchId = input.getAttribute('data-branch-id');
            const count = parseInt(input.value) || 0;
            
            if (count > 0) {
                branchIds.push(parseInt(branchId));
                counts.push(count);
            }
        });

        if (branchIds.length === 0) {
            showNotification('There is no allocation for storage.', 'warning');
            return;
        }

        // determine source_id
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? parseInt(sourceFilter.value) : 0;

        // Build request data
        const requestData = {
            branch_ids: branchIds,
            counts: counts,
            source_id: sourceId
        };

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('Please login first.', 'error');
            return;
        }

        // Display the processing status
        const saveBtn = document.getElementById('save-assignments-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="material-icons mr-2 animate-spin">refresh</i>Saving...';
        saveBtn.disabled = true;

        const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/assign_phones_to_branches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        // Return the button state to the first state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `Error saving allocations: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.meta && responseData.meta.is_success) {
            // Display allocation report
            showAssignmentReport(responseData.data.report);
            
            // Update data
            const currentSourceId = sourceFilter ? sourceFilter.value : '0';
            await updateUnassignedCountsBoxes(currentSourceId);
            await updateAssignmentSummary(currentSourceId);
            
            showNotification(responseData.meta.description, 'success');
        } else {
            throw new Error(responseData.meta?.description || 'Error saving assignments');
        }
        
    } catch (error) {
        console.error('Error saving assignments:', error);
        showNotification(error.message, 'error');
        
        // Restore button state on error
        const saveBtn = document.getElementById('save-assignments-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="material-icons mr-2">save</i>Save assignments';
            saveBtn.disabled = false;
        }
    }
}

// Function to display allocation report
export function showAssignmentReport(report) {
    if (!report || report.length === 0) return;

    const modalHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 class="text-lg font-semibold">Number allocation reporth3>
                    <button id="close-report-modal" class="text-gray-500 hover:text-gray-700">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[65vh]">
                    <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div class="flex items-center">
                            <i class="material-icons text-green-600 ml-2">check_circle</i>
                            <span class="text-green-800 font-medium">Allocation successful</span>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full border border-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="py-3 px-4 border-b text-right">branch</th>
                                    <th class="py-3 px-4 border-b text-center">requested</th>
                                    <th class="py-3 px-4 border-b text-center">allocated</th>
                                    <th class="py-3 px-4 border-b text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.map(item => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="py-3 px-4 border-b text-right">${getBranchName(item.BranchID)}</td>
                                        <td class="py-3 px-4 border-b text-center">${formatNumber(item.Requested)}</td>
                                        <td class="py-3 px-4 border-b text-center">${formatNumber(item.Assigned)}</td>
                                        <td class="py-3 px-4 border-b text-center">
                                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                item.Requested === item.Assigned ? 
                                                'bg-green-100 text-green-800' : 
                                                'bg-yellow-100 text-yellow-800'
                                            }">
                                                ${item.Requested === item.Assigned ? 'completed' : 'poor'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div class="text-center p-3 bg-blue-50 rounded-lg">
                            <div class="text-blue-600 font-bold">${formatNumber(report.reduce((sum, item) => sum + item.Requested, 0))}</div>
                            <div class="text-blue-800">requested total</div>
                        </div>
                        <div class="text-center p-3 bg-green-50 rounded-lg">
                            <div class="text-green-600 font-bold">${formatNumber(report.reduce((sum, item) => sum + item.Assigned, 0))}</div>
                            <div class="text-green-800">assigned sumdiv>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end p-6 border-t pb-4">
                    <button id="confirm-report-modal" class="bg-purple-600 text-white mb-4 px-6 py-2 rounded-md hover:bg-purple-700">
                        i understood
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add a modal to the page
    const existingModal = document.getElementById('assignment-report-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalContainer = document.createElement('div');
    modalContainer.id = 'assignment-report-modal';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // add event listeners
    document.getElementById('close-report-modal').addEventListener('click', closeReportModal);
    document.getElementById('confirm-report-modal').addEventListener('click', closeReportModal);
    
    // Close the modal by clicking outside of it
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeReportModal();
        }
    });
}

function closeReportModal() {
    const modal = document.getElementById('assignment-report-modal');
    if (modal) {
        modal.remove();
    }
}

// Function to retrieve allocations
export async function undoAssignments() {
    try {
        const sourceFilter = document.getElementById('source-filter');
        const sourceId = sourceFilter ? parseInt(sourceFilter.value) : 0;

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('Please login first.', 'error');
            return;
        }

        // Display the processing status
        const undoBtn = document.getElementById('undo-assignments-btn');
        const originalText = undoBtn.innerHTML;
        undoBtn.innerHTML = '<i class="material-icons mr-2 animate-spin">refresh</i>Recovering...';
        undoBtn.disabled = true;

        const response = await fetch(
            `${apiBaseUrl}/api/v1/phoneassignment/undo_assign_phones_from_branches?source_id=${sourceId}`, 
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Return the button state to the first state
        undoBtn.innerHTML = originalText;
        undoBtn.disabled = false;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || `Error retrieving allocations: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.meta && responseData.meta.is_success) {
            const data = responseData.data;

            if (data.has_changes) {
                // Display allocation report
                showAssignmentReport(data.report);

                // Update data
                const currentSourceId = sourceFilter ? sourceFilter.value : '0';
                await updateUnassignedCountsBoxes(currentSourceId);
                await updateAssignmentSummary(currentSourceId);

                showNotification('The operation to restore allocations was done.', 'success');
            } else {
                // There has been no change in the last hour
                showNotification(data.message || 'There is no change to return.', 'info');
            }
        } else {
            throw new Error(responseData.meta?.description || 'Error retrieving allocations');
        }
        
    } catch (error) {
        console.error('Error undoing assignments:', error);
        showNotification(error.message, 'error');
        
        // Restore button state on error
        const undoBtn = document.getElementById('undoAssignmentsBtn');
        if (undoBtn) {
            undoBtn.innerHTML = '<i class="material-icons mr-2">undo</i>Recover numbers';
            undoBtn.disabled = false;
        }
    }
}

export function initBulkAssignPage() {
    console.log("Bulk assign numbers page initialized");
    
    // organization event listeners
    setupSourceFilterListener();
    setupAssignmentFormListener(); // Add this line
    
    // Bind functions to buttons
    const equalDistBtn = document.getElementById('equal-distribution-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const saveAssignmentsBtn = document.getElementById('save-assignments-btn');
    const undoAssignmentsBtn = document.getElementById('undo-assignments-btn');
    const addAssignmentBtn = document.getElementById('add-assignment-btn');
    
    if (equalDistBtn) {
        equalDistBtn.addEventListener('click', distributeEqually);
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllAssignments);
    }
    
    if (saveAssignmentsBtn) {
        saveAssignmentsBtn.addEventListener('click', saveAssignments);
    }

    if (undoAssignmentsBtn){
        undoAssignmentsBtn.addEventListener('click', undoAssignments);
    }

    if (addAssignmentBtn) {
        if (currentState.user && currentState.user.userrolename === 'admin') {
            addAssignmentBtn.classList.remove('hidden');
            addAssignmentBtn.addEventListener('click', () => openAssignmentModal());
        } else {
            addAssignmentBtn.classList.add('hidden');
        }  
    }

    // Loading data
    loadBulkAssignmentData();
}
