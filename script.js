import { supabase, checkAuth, signOut } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Authenticate user
    const session = await checkAuth();
    if (!session) return;

    // Logout setup
    document.getElementById('logout-btn').addEventListener('click', signOut);

    const calculateBtn = document.getElementById('calculate-btn');
    const resultsSection = document.getElementById('results');
    const totalAmountEl = document.getElementById('total-amount');
    const perHeadAmountEl = document.getElementById('per-head-amount');
    const settlementsListEl = document.getElementById('settlements-list');
    
    const saveBtn = document.getElementById('save-report-btn');
    const saveStatus = document.getElementById('save-status');

    let currentCalculatedData = null; // Store for saving

    calculateBtn.addEventListener('click', () => {
        const monthYear = document.getElementById('report-month').value.trim();
        if(!monthYear) {
            alert('Please enter a Month & Year before calculating!');
            document.getElementById('report-month').focus();
            return;
        }

        const people = [];
        let totalExpense = 0;

        // Gather inputs
        for (let i = 1; i <= 4; i++) {
            const nameInput = document.getElementById(`name${i}`).value.trim();
            const name = nameInput || `Person ${i}`;
            
            const amountInput = parseFloat(document.getElementById(`amount${i}`).value);
            const amount = isNaN(amountInput) ? 0 : amountInput;

            people.push({ name, amount });
            totalExpense += amount;
        }

        const perHead = totalExpense / 4;

        // Update Summary
        totalAmountEl.textContent = `$${totalExpense.toFixed(2)}`;
        perHeadAmountEl.textContent = `$${perHead.toFixed(2)}`;

        // Calculate Settlements
        const balances = people.map(p => ({
            name: p.name,
            balance: p.amount - perHead
        }));

        const debtors = balances.filter(p => p.balance < -0.005).sort((a, b) => a.balance - b.balance);
        const creditors = balances.filter(p => p.balance > 0.005).sort((a, b) => b.balance - a.balance);

        const settlements = [];

        let i = 0; // debtors index
        let j = 0; // creditors index

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

            if (Math.abs(debtor.balance) < 0.005) {
                i++;
            }
            if (Math.abs(creditor.balance) < 0.005) {
                j++;
            }
        }

        // Render Settlements
        settlementsListEl.innerHTML = '';

        if (settlements.length === 0) {
            const li = document.createElement('li');
            li.textContent = "Everyone is settled up! No one owes anything.";
            li.style.justifyContent = 'center';
            li.style.color = 'var(--text-muted)';
            settlementsListEl.appendChild(li);
        } else {
            settlements.forEach(s => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="payer">${s.from}</span>
                    <span class="arrow">➔</span>
                    <span class="receiver">${s.to}</span>
                    <span class="arrow">:</span>
                    <span class="amount">$${s.amount.toFixed(2)}</span>
                `;
                settlementsListEl.appendChild(li);
            });
        }

        // Store data for Supabase saving
        currentCalculatedData = {
            month_name: monthYear,
            total_expense: totalExpense,
            settlements: settlements,
            user_id: session.user.id
        };

        // Reset save status
        saveStatus.classList.add('hidden');
        saveBtn.textContent = 'Save Report to Supabase';
        saveBtn.disabled = false;

        // Show Results
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Save logic
    saveBtn.addEventListener('click', async () => {
        if (!currentCalculatedData) return;

        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        const { data, error } = await supabase
            .from('monthly_reports')
            .insert([currentCalculatedData]);

        if (error) {
            saveStatus.textContent = 'Error saving report: ' + error.message;
            saveStatus.style.color = 'var(--danger)';
            saveStatus.classList.remove('hidden');
            saveBtn.textContent = 'Try Again';
            saveBtn.disabled = false;
        } else {
            saveStatus.textContent = 'Report successfully saved!';
            saveStatus.style.color = 'var(--accent)';
            saveStatus.classList.remove('hidden');
            saveBtn.textContent = 'Saved!';
        }
    });
});
