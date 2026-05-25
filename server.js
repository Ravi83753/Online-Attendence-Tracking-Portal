const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware for parsing requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let users = [
    { id: 1, name: "Admin Chief", email: "admin@company.com", phone: "5555555555", role: "admin" },
    { id: 2, name: "Alice Smith", email: "alice@company.com", phone: "1234567890", role: "intern" }
];

let attendanceLogs = [
    { id: 1, userId: 2, date: "2026-05-24", loginTime: "09:00:15 AM", logoutTime: "05:01:22 PM" }
];

// Helper function to get today's date string (YYYY-MM-DD)
const getTodayDateString = () => new Date().toISOString().split('T')[0];


// 1. Core Authentication & Clock-In Handler
app.post('/api/login', (req, res) => {
    const { name, email, phone } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required." });
    }

    // Check if user already exists
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Fallback: If it's a new intern logging in, create their profile dynamically
    if (!user) {
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: "New interns must provide Name and Phone Number to register." });
        }
        user = {
            id: users.length + 1,
            name,
            email: email.toLowerCase(),
            phone,
            role: 'intern'
        };
        users.push(user);
    }

    // Role Differentiation Routing
    if (user.role === 'admin') {
        return res.json({ success: true, redirect: 'admin', user });
    }

    // Intern Business Logic: Process Daily Clock-In
    const today = getTodayDateString();
    let log = attendanceLogs.find(l => l.userId === user.id && l.date === today);

    if (!log) {
        log = {
            id: attendanceLogs.length + 1,
            userId: user.id,
            date: today,
            loginTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            logoutTime: null
        };
        attendanceLogs.push(log);
    }

    return res.json({ success: true, redirect: 'intern', user, log });
});

// 2. Intern Clock-Out Handler
app.post('/api/logout', (req, res) => {
    const { userId } = req.body;
    const today = getTodayDateString();

    let log = attendanceLogs.find(l => l.userId === parseInt(userId) && l.date === today);

    if (log && !log.logoutTime) {
        log.logoutTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return res.json({ success: true, log });
    }

    return res.status(400).json({ success: false, message: "No active punch-in found or already clocked out for today." });
});

// 3. Admin Dashboard Resource Aggregator
app.get('/api/admin/records', (req, res) => {
    // Joins historical attendance timestamps with matching user object profiles
    const structuredRecords = attendanceLogs.map(log => {
        const profile = users.find(u => u.id === log.userId);
        return {
            name: profile ? profile.name : "Unknown Intern",
            email: profile ? profile.email : "N/A",
            phone: profile ? profile.phone : "N/A",
            date: log.date,
            loginTime: log.loginTime,
            logoutTime: log.logoutTime || "Active (Not Clocked Out)"
        };
    });

    res.json(structuredRecords);
});


app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Intern Attendance Portal (MVP)</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-50 font-sans min-h-screen flex flex-col justify-between">

    <!-- Navbar Header -->
    <header class="bg-blue-600 text-white shadow-md p-4">
        <div class="max-w-6xl mx-auto flex justify-between items-center">
            <h1 class="text-xl font-bold tracking-tight">Intern Workspace</h1>
        </div>
    </header>

    <main class="max-w-6xl mx-auto p-4 flex-grow w-full flex items-center justify-center">
        
        <!-- VIEW 1: GATEWAY ACCESS/LOGIN SCREEN -->
        <div id="authView" class="bg-white rounded-xl shadow-xl p-8 max-w-md w-full border border-slate-100">
            <h2 class="text-2xl font-bold text-slate-800 text-center mb-2">Punch Card Access</h2>
            <p class="text-slate-500 text-sm text-center mb-6">Enter details to access workspace or verify dashboard entries.</p>
            
            <form id="loginForm" onsubmit="handleAuth(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Email ID</label>
                    <input type="email" id="email" required placeholder="name@company.com" class="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500">
                    <p class="text-[11px] text-slate-400 mt-1">Use <strong class="text-slate-600">admin@company.com</strong> to view reports directly.</p>
                </div>
                <div id="extendedFormFields">
                    <div class="mb-4">
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Full Name</label>
                        <input type="text" id="name" placeholder="John Doe" class="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Phone Number</label>
                        <input type="tel" id="phone" placeholder="9876543210" class="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500">
                    </div>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white font-semibold rounded-lg py-2.5 text-sm shadow hover:bg-blue-700 transition">Authenticate Session</button>
            </form>
        </div>

        <!-- VIEW 2: INTERN WORKSPACE DASHBOARD -->
        <div id="internView" class="hidden bg-white rounded-xl shadow-xl p-8 max-w-md w-full border border-slate-100 text-center">
            <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">✓</div>
            <h2 class="text-2xl font-bold text-slate-800 mb-1">Session Authenticated</h2>
            <p class="text-slate-500 text-sm mb-6">Welcome back, <span id="internSessionName" class="font-semibold text-slate-700"></span></p>
            
            <div class="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100 text-left space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-slate-500">Punch Date:</span> <span id="lblDate" class="font-mono font-medium text-slate-800"></span></div>
                <div class="flex justify-between"><span class="text-slate-500">Clocked In At:</span> <span id="lblLoginTime" class="font-mono font-medium text-green-600"></span></div>
                <div class="flex justify-between"><span class="text-slate-500">Clocked Out At:</span> <span id="lblLogoutTime" class="font-mono font-medium text-slate-400">Not Processed</span></div>
            </div>

            <button id="btnLogout" onclick="handleClockOut()" class="w-full bg-red-500 text-white font-semibold rounded-lg py-2.5 text-sm shadow hover:bg-red-600 transition">Clock Out Session</button>
            <button onclick="resetViews()" class="w-full border border-slate-200 text-slate-600 font-semibold rounded-lg py-2.5 text-sm mt-3 hover:bg-slate-50 transition">Return to Gate</button>
        </div>

        <!-- VIEW 3: ADMIN REPORTING CONTROL PANEL -->
        <div id="adminView" class="hidden bg-white rounded-xl shadow-xl p-6 w-full border border-slate-100">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-6 gap-2">
                <div>
                    <h2 class="text-xl font-bold text-slate-800">System Records Overview</h2>
                    <p class="text-xs text-slate-500">Administrative operational monitoring dashboard</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="fetchAdminRecords()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold rounded-lg transition">Refresh Logs</button>
                    <button onclick="resetViews()" class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 text-xs font-semibold rounded-lg transition">Exit Admin Mode</button>
                </div>
            </div>

            <div class="overflow-x-auto rounded-lg border border-slate-100">
                <table class="w-full text-left text-sm text-slate-600">
                    <thead class="text-xs text-slate-700 bg-slate-50 uppercase font-semibold">
                        <tr>
                            <th class="p-3">Intern Profile Details</th>
                            <th class="p-3">Phone</th>
                            <th class="p-3 text-center">Tracking Date</th>
                            <th class="p-3">In-Time</th>
                            <th class="p-3">Out-Time</th>
                        </tr>
                    </thead>
                    <tbody id="adminTableBody" class="divide-y divide-slate-100">
                        <!-- Populated dynamically via JS -->
                    </tbody>
                </table>
            </div>
        </div>

    </main>


    <!-- Frontend Functional Routing Engine Script -->
    <script>
        let currentAuthenticatedUserId = null;

        // Front-end UI switch routing to hide/show layers
        function routeTo(viewName) {
            document.getElementById('authView').classList.add('hidden');
            document.getElementById('internView').classList.add('hidden');
            document.getElementById('adminView').classList.add('hidden');

            if (viewName === 'auth') document.getElementById('authView').classList.remove('hidden');
            if (viewName === 'intern') document.getElementById('internView').classList.remove('hidden');
            if (viewName === 'admin') document.getElementById('adminView').classList.remove('hidden');
        }

        function resetViews() {
            currentAuthenticatedUserId = null;
            document.getElementById('loginForm').reset();
            routeTo('auth');
        }

        async function handleAuth(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone })
                });
                const data = await response.json();

                if (!response.ok) throw new Error(data.message || 'Request failed execution context.');

                if (data.redirect === 'admin') {
                    routeTo('admin');
                    fetchAdminRecords();
                } else if (data.redirect === 'intern') {
                    currentAuthenticatedUserId = data.user.id;
                    document.getElementById('internSessionName').innerText = data.user.name;
                    document.getElementById('lblDate').innerText = data.log.date;
                    document.getElementById('lblLoginTime').innerText = data.log.loginTime;
                    
                    if(data.log.logoutTime) {
                        document.getElementById('lblLogoutTime').innerText = data.log.logoutTime;
                        document.getElementById('btnLogout').disabled = true;
                        document.getElementById('btnLogout').className = "w-full bg-slate-300 text-slate-500 font-semibold rounded-lg py-2.5 text-sm cursor-not-allowed";
                    } else {
                        document.getElementById('lblLogoutTime').innerText = "Active Session";
                        document.getElementById('btnLogout').disabled = false;
                        document.getElementById('btnLogout').className = "w-full bg-red-500 text-white font-semibold rounded-lg py-2.5 text-sm shadow hover:bg-red-600 transition";
                    }
                    routeTo('intern');
                }
            } catch (err) {
                alert('Authentication Warning: ' + err.message);
            }
        }

        async function handleClockOut() {
            if (!currentAuthenticatedUserId) return;
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentAuthenticatedUserId })
                });
                const data = await response.json();

                if (!response.ok) throw new Error(data.message);

                document.getElementById('lblLogoutTime').innerText = data.log.logoutTime;
                document.getElementById('btnLogout').disabled = true;
                document.getElementById('btnLogout').className = "w-full bg-slate-300 text-slate-500 font-semibold rounded-lg py-2.5 text-sm cursor-not-allowed";
                alert('Clock-out processed successfully.');
            } catch (err) {
                alert('Execution Error: ' + err.message);
            }
        }

        async function fetchAdminRecords() {
            try {
                const response = await fetch('/api/admin/records');
                const data = await response.json();
                const tbody = document.getElementById('adminTableBody');
                tbody.innerHTML = '';

                if(data.length === 0) {
                    tbody.innerHTML = \`<tr><td colspan="5" class="p-4 text-center text-xs text-slate-400 font-medium">No records captured in runtime memory space yet.</td></tr>\`;
                    return;
                }

                data.forEach(row => {
                    const statusBadgeClass = row.logoutTime.includes("Active") 
                        ? "bg-green-100 text-green-700 font-semibold" 
                        : "bg-slate-100 text-slate-700";

                    tbody.innerHTML += \`
                        <tr class="hover:bg-slate-50/70 transition">
                            <td class="p-3">
                                <div class="font-semibold text-slate-800 text-sm">\${row.name}</div>
                                <div class="text-xs text-slate-400 font-mono">\${row.email}</div>
                            </td>
                            <td class="p-3 text-xs font-mono text-slate-600">\${row.phone}</td>
                            <td class="p-3 text-center text-xs font-medium text-slate-600">\${row.date}</td>
                            <td class="p-3 text-xs font-mono font-medium text-green-600">\${row.loginTime}</td>
                            <td class="p-3 text-xs font-mono"><span class="px-2 py-0.5 rounded text-[11px] \${statusBadgeClass}">\${row.logoutTime}</span></td>
                        </tr>
                    \`;
                });
            } catch (err) {
                console.error("Dashboard Sync Fail: ", err);
            }
        }
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});