import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://njsnniywkurqexlmsaxf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qc25uaXl3a3VycWV4bG1zYXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzE5NzUsImV4cCI6MjA5MjgwNzk3NX0.Vur2mbAyAvR1DhHiZCoIETjFiJLxkzTZ43IKngXnKls'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session;
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}
