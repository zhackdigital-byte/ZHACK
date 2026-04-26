import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // If already logged in, redirect to index
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const loginBtn = document.getElementById('login-btn');

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            loginBtn.textContent = 'Logging in...';
            loginBtn.disabled = true;
            errorMessage.classList.add('hidden');

            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailInput.value,
                password: passwordInput.value
            });

            if (error) {
                errorMessage.textContent = error.message;
                errorMessage.classList.remove('hidden');
                loginBtn.textContent = 'Login';
                loginBtn.disabled = false;
            } else {
                window.location.href = 'index.html';
            }
        });
    }
});
