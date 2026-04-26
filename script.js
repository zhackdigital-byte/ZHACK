import { supabase, checkAuth, signOut } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Authenticate user
    const session = await checkAuth();
    if (!session) return;

    // Logout setup
    document.getElementById('logout-btn').addEventListener('click', signOut);

    // Date default
    document.getElementById('expense-date').valueAsDate = new Date();

    const expenseForm = document.getElementById('expense-form');
    const expensesList = document.getElementById('expenses-list');
    const loadingExpenses = document.getElementById('loading-expenses');
    const noExpenses = document.getElementById('no-expenses');

    // Totals Elements
    const totalsGrid = document.getElementById('totals-grid');
    const grandTotalEl = document.getElementById('grand-total-amount');

    // Dynamic Persons Management
    let persons = JSON.parse(localStorage.getItem(`mess_persons_${session.user.id}`)) || [];
    // Clear out old demo data if it hasn't been modified
    if (JSON.stringify(persons) === JSON.stringify(['Person 1', 'Person 2', 'Person 3', 'Person 4'])) {
        persons = [];
    }

    function savePersons() {
        localStorage.setItem(`mess_persons_${session.user.id}`, JSON.stringify(persons));
        renderPersonsSelect();
        updateTotals();
    }

    function renderPersonsSelect() {
        const personSelect = document.getElementById('person-name');
        if (!personSelect) return;
        const currentValue = personSelect.value;
        personSelect.innerHTML = '';
        persons.forEach(p => {
            const option = document.createElement('option');
            option.value = p;
            option.textContent = p;
            personSelect.appendChild(option);
        });
        if (currentValue && persons.includes(currentValue)) {
            personSelect.value = currentValue;
        }
    }

    const addPersonBtn = document.getElementById('add-person-btn');
    if (addPersonBtn) {
        addPersonBtn.addEventListener('click', () => {
            const input = document.getElementById('new-person-name');
            const name = input.value.trim();
            if (name && !persons.includes(name)) {
                persons.push(name);
                input.value = '';
                savePersons();
            }
        });
    }

    renderPersonsSelect();

    let currentExpenses = [];

    // Load Expenses
    async function loadExpenses() {
        loadingExpenses.classList.remove('hidden');
        expensesList.classList.add('hidden');
        noExpenses.classList.add('hidden');

        const { data, error } = await supabase
            .from('daily_expenses')
            .select('*')
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false });

        loadingExpenses.classList.add('hidden');

        if (error) {
            console.error('Error loading expenses:', error);
            return;
        }

        currentExpenses = data || [];
        renderExpenses();
        updateTotals();
    }

    function renderExpenses() {
        if (currentExpenses.length === 0) {
            noExpenses.classList.remove('hidden');
            expensesList.classList.add('hidden');
            return;
        }

        expensesList.innerHTML = '';
        currentExpenses.forEach(exp => {
            const li = document.createElement('li');
            li.className = 'expense-item';
            
            const descHtml = exp.description ? `<p>${exp.description}</p>` : '';
            const dateStr = new Date(exp.expense_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});

            li.innerHTML = `
                <div class="expense-info">
                    <h4>${exp.person_name} <span style="font-weight: normal; color: var(--text-muted); font-size: 0.85rem;">• ${dateStr}</span></h4>
                    ${descHtml}
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <span class="expense-amount">$${parseFloat(exp.amount).toFixed(2)}</span>
                    <button class="nav-btn delete-expense-btn" data-id="${exp.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: var(--danger); border-color: var(--danger);">X</button>
                </div>
            `;
            expensesList.appendChild(li);
        });

        expensesList.classList.remove('hidden');
        noExpenses.classList.add('hidden');

        // Attach delete listeners
        document.querySelectorAll('.delete-expense-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                e.currentTarget.disabled = true;
                await supabase.from('daily_expenses').delete().eq('id', id);
                loadExpenses();
            });
        });
    }

    function updateTotals() {
        let totals = {};
        persons.forEach(p => totals[p] = 0);
        let grandTotal = 0;
        let personsUpdated = false;

        currentExpenses.forEach(exp => {
            const amt = parseFloat(exp.amount);
            if (totals[exp.person_name] !== undefined) {
                totals[exp.person_name] += amt;
                grandTotal += amt;
            } else {
                totals[exp.person_name] = amt;
                grandTotal += amt;
                if (!persons.includes(exp.person_name)) {
                    persons.push(exp.person_name);
                    personsUpdated = true;
                }
            }
        });

        if (personsUpdated) {
            savePersons();
            return;
        }

        if (totalsGrid) {
            totalsGrid.innerHTML = '';
            persons.forEach(p => {
                const item = document.createElement('div');
                item.className = 'total-item';
                item.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <button class="nav-btn remove-person-btn" data-name="${p}" style="padding: 0.1rem 0.4rem; font-size: 0.7rem; color: var(--danger); border-color: var(--danger);" title="Remove Person">✕</button>
                            <span class="person-label">${p}</span>
                        </div>
                        <span class="person-total">$${(totals[p] || 0).toFixed(2)}</span>
                    </div>
                `;
                totalsGrid.appendChild(item);
            });

            document.querySelectorAll('.remove-person-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const nameToRemove = e.currentTarget.getAttribute('data-name');
                    const hasExpenses = currentExpenses.some(exp => exp.person_name === nameToRemove);
                    if (hasExpenses) {
                        alert(`Cannot remove ${nameToRemove} because they have existing expenses. Delete their expenses first.`);
                        return;
                    }
                    if (confirm(`Remove ${nameToRemove}?`)) {
                        persons = persons.filter(p => p !== nameToRemove);
                        savePersons();
                    }
                });
            });
        }

        grandTotalEl.textContent = `$${grandTotal.toFixed(2)}`;
    }

    // Add Expense
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('add-expense-btn');
        const status = document.getElementById('expense-status');
        btn.disabled = true;
        btn.textContent = 'Adding...';
        status.classList.add('hidden');

        const newExpense = {
            user_id: session.user.id,
            person_name: document.getElementById('person-name').value,
            amount: parseFloat(document.getElementById('expense-amount').value),
            description: document.getElementById('expense-desc').value.trim(),
            expense_date: document.getElementById('expense-date').value
        };

        const { error } = await supabase.from('daily_expenses').insert([newExpense]);

        if (error) {
            status.textContent = 'Error: ' + error.message;
            status.style.color = 'var(--danger)';
            status.classList.remove('hidden');
        } else {
            expenseForm.reset();
            document.getElementById('expense-date').valueAsDate = new Date();
            loadExpenses();
        }

        btn.disabled = false;
        btn.textContent = 'Add Expense';
    });

    // Close Month
    const closeMonthBtn = document.getElementById('close-month-btn');
    closeMonthBtn.addEventListener('click', async () => {
        let reportMonth = document.getElementById('report-month').value.trim();
        const status = document.getElementById('close-status');
        
        if (!reportMonth) {
            // Auto generate month name
            reportMonth = new Date().toLocaleDateString(undefined, {month: 'long', year: 'numeric'});
            document.getElementById('report-month').value = reportMonth;
        }

        if (currentExpenses.length === 0) {
            status.textContent = "No expenses to save!";
            status.style.color = "var(--danger)";
            status.classList.remove('hidden');
            return;
        }

        closeMonthBtn.disabled = true;
        closeMonthBtn.textContent = 'Processing...';

        // 1. Calculate Totals
        let totals = {};
        persons.forEach(p => totals[p] = 0);
        let grandTotal = 0;

        currentExpenses.forEach(exp => {
            if (totals[exp.person_name] !== undefined) {
                const amt = parseFloat(exp.amount);
                totals[exp.person_name] += amt;
                grandTotal += amt;
            }
        });

        const perHead = persons.length > 0 ? grandTotal / persons.length : 0;

        // 2. Settlement Algorithm
        const balances = Object.keys(totals).map(name => ({
            name: name,
            balance: totals[name] - perHead
        }));

        const debtors = balances.filter(p => p.balance < -0.005).sort((a, b) => a.balance - b.balance);
        const creditors = balances.filter(p => p.balance > 0.005).sort((a, b) => b.balance - a.balance);

        const settlements = [];
        let i = 0; let j = 0;

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];
            const debt = Math.abs(debtor.balance);
            const credit = creditor.balance;
            const settledAmount = Math.min(debt, credit);

            settlements.push({
                from: debtor.name,
                to: creditor.name,
                amount: settledAmount
            });

            debtor.balance += settledAmount;
            creditor.balance -= settledAmount;

            if (Math.abs(debtor.balance) < 0.005) i++;
            if (Math.abs(creditor.balance) < 0.005) j++;
        }

        // 3. Save to monthly_reports
        const reportData = {
            user_id: session.user.id,
            month_name: reportMonth,
            total_expense: grandTotal,
            settlements: settlements
        };

        const { error: insertError } = await supabase.from('monthly_reports').insert([reportData]);

        if (insertError) {
            status.textContent = "Error saving report: " + insertError.message;
            status.style.color = "var(--danger)";
            status.classList.remove('hidden');
            closeMonthBtn.disabled = false;
            closeMonthBtn.textContent = 'Close Month & Save Report';
            return;
        }

        // 4. Delete old daily_expenses
        const { error: deleteError } = await supabase.from('daily_expenses')
            .delete()
            .eq('user_id', session.user.id);

        if (deleteError) {
            console.error("Error clearing daily expenses:", deleteError);
            // Non-fatal, just log it.
        }

        // 5. Show Modal
        document.getElementById('modal-total-amount').textContent = `$${grandTotal.toFixed(2)}`;
        document.getElementById('modal-per-head').textContent = `$${perHead.toFixed(2)}`;
        
        const modalList = document.getElementById('modal-settlements-list');
        modalList.innerHTML = '';
        if (settlements.length === 0) {
            modalList.innerHTML = `<li style="justify-content:center; color:var(--text-muted)">Everyone is settled up!</li>`;
        } else {
            settlements.forEach(s => {
                modalList.innerHTML += `
                    <li>
                        <span class="payer">${s.from}</span>
                        <span class="arrow">➔</span>
                        <span class="receiver">${s.to}</span>
                        <span class="arrow">:</span>
                        <span class="amount">$${s.amount.toFixed(2)}</span>
                    </li>`;
            });
        }

        document.getElementById('settlement-modal').classList.remove('hidden');

        // Reset state
        closeMonthBtn.disabled = false;
        closeMonthBtn.textContent = 'Close Month & Save Report';
        document.getElementById('report-month').value = '';
        loadExpenses();
    });

    // Close Modal
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('settlement-modal').classList.add('hidden');
    });

    // Init
    loadExpenses();
});
