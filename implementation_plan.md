# Daily Expenses Upgrade Plan

To track daily expenses instead of just doing a single calculation at the end of the month, we need to completely revamp how the app works. Here is the elegant approach I propose:

## 1. Database Changes
We will need to add a new table in Supabase to track every single receipt/expense.

```sql
create table public.daily_expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  person_name text not null,
  amount numeric not null,
  description text,
  expense_date date not null default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Securityjgjhj
alter table public.daily_expenses enable row level security;

-- Policies
create policy "Users can view their own expenses" on public.daily_expenses for select using ( auth.uid() = user_id );
create policy "Users can insert their own expenses" on public.daily_expenses for insert with check ( auth.uid() = user_id );
create policy "Users can delete their own expenses" on public.daily_expenses for delete using ( auth.uid() = user_id );
```

## 2. Interface Changes (`index.html`)

Instead of asking for 4 large totals, the new main page will be a **Dashboard**:
- **Add Expense Form**: Input fields for `Date`, `Who Paid` (Dropdown: Person 1, 2, 3, 4), `Amount`, and `Description` (e.g. "Milk & Bread").
- **Recent Expenses List**: A scrollable list showing all expenses you've added this month.
- **Current Totals**: A live summary showing how much Person 1, 2, 3, and 4 have spent in total so far this month.

## 3. The "End of Month" Action

At the very bottom of the dashboard, there will be a giant **"Close Month & Calculate Settlements"** button.
When you click this at the end of the month:
1. It looks at all the daily expenses and calculates the final totals.
2. It runs the settlement algorithm (Who owes Whom).
3. It saves the final results to your existing `monthly_reports` table.
4. It clears out the daily expenses from the dashboard so you can start fresh for the next month!

## User Review
Does this flow sound perfect for your needs? If you approve, please **run the SQL code above in your Supabase SQL Editor** to create the `daily_expenses` table, and let me know when you're done so I can rewrite the code!
