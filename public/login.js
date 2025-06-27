document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginMsg = document.getElementById('login-msg');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('login', 'true');
                localStorage.setItem('role', data.role || 'user');
                localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
                window.location.href = 'manage.html';
            } else {
                loginMsg.textContent = '登入失敗：' + (data.error || '帳號或密碼錯誤');
            }
        });
    });
}); 