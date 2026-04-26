import { supabase, checkAuth, signOut } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Authenticate user
    const session = await checkAuth();
    if (!session) return;

    // Logout setup
    document.getElementById('logout-btn').addEventListener('click', signOut);

    const reportsContainer = document.getElementById('reports-container');
    const loadingEl = document.getElementById('loading');
    const noReportsEl = document.getElementById('no-reports');

    async function loadReports() {
        loadingEl.classList.remove('hidden');
        reportsContainer.classList.add('hidden');
        noReportsEl.classList.add('hidden');

        const { data, error } = await supabase
            .from('monthly_reports')
            .select('*')
            .order('created_at', { ascending: false });

        loadingEl.classList.add('hidden');

        if (error) {
            alert('Error loading reports: ' + error.message);
            return;
        }

        if (data.length === 0) {
            noReportsEl.classList.remove('hidden');
            return;
        }

        reportsContainer.innerHTML = '';
        data.forEach(report => {
            const date = new Date(report.created_at).toLocaleDateString();
            
            const div = document.createElement('div');
            div.className = 'report-item';
            div.innerHTML = `
                <div class="report-info">
                    <h3>${report.month_name}</h3>
                    <p>Total Expense: <strong>$${report.total_expense.toFixed(2)}</strong></p>
                    <p>Calculated on: ${date}</p>
                </div>
                <button class="delete-btn" data-id="${report.id}">Delete</button>
            `;
            reportsContainer.appendChild(div);
        });

        reportsContainer.classList.remove('hidden');

        // Attach delete listeners
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this report?')) {
                    e.target.textContent = 'Deleting...';
                    e.target.disabled = true;
                    const { error: delError } = await supabase
                        .from('monthly_reports')
                        .delete()
                        .eq('id', id);
                    
                    if (delError) {
                        alert('Error deleting: ' + delError.message);
                        e.target.textContent = 'Delete';
                        e.target.disabled = false;
                    } else {
                        loadReports(); // Reload list
                    }
                }
            });
        });
    }

    loadReports();
});
