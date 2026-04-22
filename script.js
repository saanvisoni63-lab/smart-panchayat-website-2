/* Smart Panchayat - main script (localStorage) */
const $ = id => document.getElementById(id);

/* ---------- startup ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // wire up auth controls (some elements may not exist right away)
  const lb = $("loginBtn"); if (lb) lb.onclick = login;
  const sb = $("signupBtn"); if (sb) sb.onclick = signup;
  const ss = $("showSignup"); if (ss) ss.onclick = () => switchAuth('signup');
  const bt = $("backToLogin"); if (bt) bt.onclick = () => switchAuth('login');
  const lo = $("logoutBtn"); if (lo) lo.onclick = logout;

  // New robust login button binding
  const loginBtns = ['navLoginBtn', 'heroLoginBtn', 'ctaLoginBtn'];
  loginBtns.forEach(id => {
    const btn = $(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`Login button clicked: ${id}`);
        showLogin();
      });
    }
  });

  // Wire up admin login button
  const showAdminLogin = document.getElementById("showAdminLogin");
  if (showAdminLogin) showAdminLogin.onclick = () => switchAuth('admin');

  // show landing page first, or app if already logged in
  const currentUser = sessionStorage.getItem("sp_user");
  const userType = sessionStorage.getItem("sp_userType") || "user";
  if (currentUser) {
    $("landingPage")?.classList.add("hidden");
    $("authLayer")?.classList.add("hidden");
    $("app").classList.remove("hidden");
    $("profileName").innerText = userType === "admin" ? currentUser + " (Admin)" : currentUser;
    $("welcomeText").innerText = `Welcome, ${currentUser}${userType === "admin" ? " (Admin)" : ""}`;

    // Update profile role display
    const profileRole = document.querySelector(".profile .muted.small");
    if (profileRole) {
      profileRole.innerText = userType === "admin" ? "Administrator" : "Citizen";
    }

    // Hide/show sidebar based on user type
    const userNav = document.getElementById("userNav");
    const adminNav = document.getElementById("adminNav");
    const sidebar = document.querySelector(".sidebar");

    if (sidebar) sidebar.style.display = "block";

    if (userType === "admin") {
      if (userNav) userNav.classList.add("hidden");
      if (adminNav) adminNav.classList.remove("hidden");
    } else {
      if (userNav) userNav.classList.remove("hidden");
      if (adminNav) adminNav.classList.add("hidden");
    }

    if (userType === "admin") {
      loadContent("admin-dashboard");
    } else {
      loadContent("home");
      // Check if user has seen onboarding
      const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${currentUser}`);
      if (!hasSeenOnboarding) {
        setTimeout(() => showOnboarding(), 500);
      }
    }
  } else {
    // Show landing page, hide auth layer
    $("landingPage")?.classList.remove("hidden");
    $("authLayer")?.classList.add("hidden");
  }
});

/* ---------- landing page navigation ---------- */
function showLogin() {
  console.log("showLogin called");
  $("landingPage")?.classList.add("hidden");
  $("authLayer")?.classList.remove("hidden");
  switchAuth('login');
}

/* ---------- auth helpers (now using backend) ---------- */

function switchAuth(mode) {
  // mode = 'signup', 'login', 'admin', 'admin-signup', or 'forgot-password'
  const loginBox = $("loginBox"), signupBox = $("signupBox"), adminLoginBox = $("adminLoginBox"), adminSignupBox = $("adminSignupBox"), forgotPasswordBox = $("forgotPasswordBox");
  if (!loginBox || !signupBox) return;

  // Hide all first
  loginBox.classList.add("hidden");
  signupBox.classList.add("hidden");
  if (adminLoginBox) adminLoginBox.classList.add("hidden");
  if (adminSignupBox) adminSignupBox.classList.add("hidden");
  if (forgotPasswordBox) forgotPasswordBox.classList.add("hidden");

  if (mode === 'signup') {
    signupBox.classList.remove("hidden");
  } else if (mode === 'admin') {
    if (adminLoginBox) adminLoginBox.classList.remove("hidden");
  } else if (mode === 'admin-signup') {
    if (adminSignupBox) adminSignupBox.classList.remove("hidden");
  } else if (mode === 'forgot-password') {
    if (forgotPasswordBox) forgotPasswordBox.classList.remove("hidden");
  } else {
    loginBox.classList.remove("hidden");
  }
}

function forgotPassword() {
  const e = $("forgotPasswordEmail").value?.trim();
  const p = $("forgotPasswordNewPass").value?.trim();
  if (!e || !p) {
    $("forgotPasswordMsg").style.color = "#ef4444";
    $("forgotPasswordMsg").innerText = "Email and new password are required!";
    return;
  }

  fetch("/api/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: e, newPassword: p })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        $("forgotPasswordMsg").style.color = "green";
        $("forgotPasswordMsg").innerText = data.message || "Password reset successfully.";
        setTimeout(() => switchAuth('login'), 2000);
      } else {
        $("forgotPasswordMsg").style.color = "#ef4444";
        $("forgotPasswordMsg").innerText = data.message || "Failed to reset password.";
      }
    })
    .catch(err => {
      console.error("Forgot password error:", err);
      $("forgotPasswordMsg").style.color = "#ef4444";
      $("forgotPasswordMsg").innerText = "Server error. Please try again.";
    });
}

// Admin Registration
function adminSignup() {
  const u = $("adminSignupUser").value?.trim();
  const e = $("adminSignupEmail").value?.trim();
  const ph = $("adminSignupPhone").value?.trim();
  const p = $("adminSignupPass").value?.trim();

  if (!u || !e || !ph || !p) {
    $("adminSignupMsg").style.color = "#ef4444";
    $("adminSignupMsg").innerText = "All fields required!";
    return;
  }

  fetch("/api/admin/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, email: e, phone: ph, password: p })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        $("adminSignupMsg").style.color = "green";
        $("adminSignupMsg").innerText = data.message || "Admin registered successfully.";
        setTimeout(() => switchAuth('admin'), 1500);
      } else {
        $("adminSignupMsg").style.color = "#ef4444";
        $("adminSignupMsg").innerText = data.message || "Registration failed.";
      }
    })
    .catch(err => {
      console.error("Admin signup error:", err);
      $("adminSignupMsg").style.color = "#ef4444";
      $("adminSignupMsg").innerText = "Server error. Please try again.";
    });
}

function adminLogin() {
  const username = $("adminUsername").value?.trim();
  const password = $("adminPassword").value?.trim();
  const err = $("adminLoginError");

  if (!username || !password) {
    if (err) err.innerText = "Enter username and password";
    return;
  }

  fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        sessionStorage.setItem("sp_user", data.admin.username);
        sessionStorage.setItem("sp_userType", "admin");
        $("landingPage")?.classList.add("hidden");
        $("authLayer").classList.add("hidden");
        $("app").classList.remove("hidden");
        $("profileName").innerText = data.admin.username + " (Admin)";
        $("welcomeText").innerText = `Welcome, ${data.admin.username} (Admin)`;

        // Update profile role display
        const profileRole = document.querySelector(".profile .muted.small");
        if (profileRole) {
          profileRole.innerText = "Administrator";
        }

        // Hide user nav, show admin nav
        const userNav = document.getElementById("userNav");
        const adminNav = document.getElementById("adminNav");
        const sidebar = document.querySelector(".sidebar");

        if (sidebar) sidebar.style.display = "block";
        if (userNav) userNav.classList.add("hidden");
        if (adminNav) adminNav.classList.remove("hidden");

        loadContent("admin-dashboard");
      } else {
        if (err) {
          err.innerText = data.message || "Invalid credentials";
          setTimeout(() => err.innerText = "", 3000);
        }
      }
    })
    .catch(fetchErr => {
      console.error("Admin login error:", fetchErr);
      if (err) {
        err.innerText = "Cannot reach server. Please try again.";
        setTimeout(() => err.innerText = "", 3000);
      }
    });
}

function signup() {
  const u = $("signupUser").value?.trim();
  const e = $("signupEmail").value?.trim();
  const ph = $("signupPhone").value?.trim();
  const p = $("signupPass").value?.trim();
  if (!u || !e || !ph || !p) {
    $("signupMsg").style.color = "#ef4444";
    $("signupMsg").innerText = "All fields required!";
    return;
  }

  fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, email: e, phone: ph, password: p })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        $("signupMsg").style.color = "green";
        $("signupMsg").innerText = data.message || "Account created — please login.";
        setTimeout(() => switchAuth('login'), 1100);
      } else {
        $("signupMsg").style.color = "#ef4444";
        $("signupMsg").innerText = data.message || "Signup failed.";
      }
    })
    .catch(err => {
      console.error("Signup error:", err);
      $("signupMsg").style.color = "#ef4444";
      $("signupMsg").innerText = "Server error. Please try again.";
    });
}

function login() {
  const u = $("loginUser").value?.trim();
  const p = $("loginPass").value?.trim();
  const err = $("loginError");
  if (!u || !p) { if (err) err.innerText = "Enter username and password"; return; }

  fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: u, password: p })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const username = data.user?.username || u;
        sessionStorage.setItem("sp_user", username);
        sessionStorage.setItem("sp_userType", "user");
        $("landingPage")?.classList.add("hidden");
        $("authLayer").classList.add("hidden");
        $("app").classList.remove("hidden");
        $("profileName").innerText = username;
        $("welcomeText").innerText = `Welcome, ${username}`;
        loadContent("home");

        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${username}`);
        if (!hasSeenOnboarding) {
          setTimeout(() => showOnboarding(), 500);
        }
      } else {
        if (err) {
          err.innerText = data.message || "Invalid credentials";
          setTimeout(() => err.innerText = "", 2000);
        }
      }
    })
    .catch(fetchErr => {
      console.error("Login error:", fetchErr);
      if (err) {
        err.innerText = "Cannot reach server. Please try again.";
        setTimeout(() => err.innerText = "", 2000);
      }
    });
}

function logout() {
  sessionStorage.removeItem("sp_user");
  sessionStorage.removeItem("sp_userType");
  // return to landing page
  $("app").classList.add("hidden");
  $("authLayer").classList.add("hidden");
  $("landingPage")?.classList.remove("hidden");
}

/* ---------- Backend API Simulation ---------- */
const BackendAPI = {
  // Simulate API delay
  delay: (ms = 300) => new Promise(resolve => setTimeout(resolve, ms)),

  // Events API
  events: {
    async getAll() {
      await BackendAPI.delay(200);
      let events = JSON.parse(localStorage.getItem("backend_events") || "[]");

      // Initialize with default events if empty
      if (events.length === 0) {
        const defaultEvents = [
          {
            id: 'EVT-001',
            title: 'Gram Sabha Meeting',
            description: 'Monthly community meeting to discuss village development and citizen concerns',
            date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'meeting',
            location: 'Panchayat Office',
            organizer: 'Village Panchayat',
            attendees: [],
            status: 'upcoming',
            icon: 'fas fa-users'
          },
          {
            id: 'EVT-002',
            title: 'Free Health Camp',
            description: 'Free health checkups, blood tests, and consultation for all villagers',
            date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'health',
            location: 'Community Health Center',
            organizer: 'Health Department',
            attendees: [],
            status: 'upcoming',
            icon: 'fas fa-stethoscope'
          },
          {
            id: 'EVT-003',
            title: 'Tree Plantation Drive',
            description: 'Community tree plantation initiative. Volunteers welcome!',
            date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'environment',
            location: 'Village Park',
            organizer: 'Green Initiative Committee',
            attendees: [],
            status: 'upcoming',
            icon: 'fas fa-tree'
          },

          {
            id: 'EVT-005',
            title: 'Vaccination Drive',
            description: 'COVID-19 and routine vaccination for all age groups',
            date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'health',
            location: 'Health Center',
            organizer: 'Health Department',
            attendees: [],
            status: 'upcoming',
            icon: 'fas fa-syringe'
          }
        ];
        events = defaultEvents;
        localStorage.setItem("backend_events", JSON.stringify(events));
      }
      // Keep attendees consistently as an array for RSVP logic.
      events = events.map(ev => ({ ...ev, attendees: Array.isArray(ev.attendees) ? ev.attendees : [] }));
      return events;
    },

    async registerForEvent(eventId, userId) {
      await BackendAPI.delay(200);
      let events = await BackendAPI.events.getAll();
      const event = events.find(e => e.id === eventId);
      if (event) {
        if (!Array.isArray(event.attendees)) event.attendees = [];
        if (!event.attendees.includes(userId)) {
          event.attendees.push(userId);
          localStorage.setItem("backend_events", JSON.stringify(events));
          return { success: true, message: 'Registered successfully!' };
        }
        return { success: false, message: 'Already registered' };
      }
      return { success: false, message: 'Event not found' };
    },

    async createEvent(eventData) {
      await BackendAPI.delay(300);
      const userType = sessionStorage.getItem("sp_userType");
      const adminUser = sessionStorage.getItem("sp_user");
      if (userType !== "admin" || !adminUser) {
        throw new Error("Only admin can create events");
      }

      let events = await BackendAPI.events.getAll();
      const newEvent = {
        id: 'EVT-' + Date.now(),
        ...eventData,
        attendees: [],
        status: 'upcoming',
        createdBy: adminUser,
        createdAt: new Date().toISOString()
      };
      events.push(newEvent);
      localStorage.setItem("backend_events", JSON.stringify(events));
      return newEvent;
    },

    async deleteEvent(eventId) {
      await BackendAPI.delay(250);
      const userType = sessionStorage.getItem("sp_userType");
      if (userType !== "admin") {
        throw new Error("Only admin can delete events");
      }

      const events = await BackendAPI.events.getAll();
      const remaining = events.filter(e => e.id !== eventId);
      localStorage.setItem("backend_events", JSON.stringify(remaining));
      return { success: remaining.length !== events.length };
    }
  },

  // Analytics API
  analytics: {
    async getDashboardStats(userId) {
      await BackendAPI.delay(150);
      const apps = getApps().filter(a => a.user === userId);
      const complaints = getComplaints().filter(c => c.user === userId);

      return {
        totalApplications: apps.length,
        pendingApplications: apps.filter(a => a.status === 'Pending').length,
        approvedApplications: apps.filter(a => a.status === 'Approved').length,
        totalComplaints: complaints.length,
        resolvedComplaints: complaints.filter(c => c.status === 'Resolved').length
      };
    },

    async getUserActivity(userId) {
      await BackendAPI.delay(200);
      const apps = getApps().filter(a => a.user === userId);
      const recentActivity = apps
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)
        .map(a => ({
          type: a.type,
          status: a.status,
          date: a.date,
          action: 'application'
        }));
      return recentActivity;
    }
  },

  // Applications API
  applications: {
    async submitApplication(application) {
      await BackendAPI.delay(300);
      // Store application in backend
      let applications = JSON.parse(localStorage.getItem("backend_applications") || "[]");
      applications.push(application);
      localStorage.setItem("backend_applications", JSON.stringify(applications));
      return { success: true, applicationId: application.id };
    },

    async getApplicationStatus(applicationId) {
      await BackendAPI.delay(200);
      let applications = JSON.parse(localStorage.getItem("backend_applications") || "[]");
      const app = applications.find(a => a.id === applicationId);
      return app ? { status: app.status, details: app } : null;
    }
  },

  // Recommendations API
  recommendations: {
    async getRecommendations(userId) {
      await BackendAPI.delay(250);
      const apps = getApps().filter(a => a.user === userId);
      const recommendations = [];

      // Recommend schemes based on user activity
      if (!apps.some(a => a.type.includes('PM Kisan'))) {
        recommendations.push({
          type: 'scheme',
          title: 'PM Kisan Scheme',
          description: 'You might be eligible for farmer income support',
          icon: 'fas fa-tractor'
        });
      }

      if (!apps.some(a => a.type.includes('Ayushman Bharat'))) {
        recommendations.push({
          type: 'scheme',
          title: 'Ayushman Bharat',
          description: 'Get health insurance coverage up to ₹5 lakh',
          icon: 'fas fa-heartbeat'
        });
      }

      // Recommend services


      return recommendations.slice(0, 3);
    }
  }
};

/* ---------- localStorage for apps & complaints ---------- */
function getApps() { return JSON.parse(localStorage.getItem("sp_apps") || "[]"); }
function saveApps(list) { localStorage.setItem("sp_apps", JSON.stringify(list)); }

function getComplaints() { return JSON.parse(localStorage.getItem("sp_complaints") || "[]"); }
function saveComplaints(list) { localStorage.setItem("sp_complaints", JSON.stringify(list)); }

/* ---------- main navigation / content ---------- */
function loadContent(type) {
  // nav active
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const btn = [...document.querySelectorAll(".nav-item")].find(b => b.textContent.toLowerCase().includes(type));
  if (btn) btn.classList.add("active");

  // Hide/show proper nav based on user type
  const userType = sessionStorage.getItem("sp_userType") || "user";
  const userNav = document.getElementById("userNav");
  const adminNav = document.getElementById("adminNav");
  const sidebar = document.querySelector(".sidebar");

  if (sidebar) sidebar.style.display = "block";

  if (userType === "admin") {
    if (userNav) userNav.classList.add("hidden");
    if (adminNav) adminNav.classList.remove("hidden");
  } else {
    if (userNav) userNav.classList.remove("hidden");
    if (adminNav) adminNav.classList.add("hidden");
  }

  const area = $("contentArea");
  if (!area) return;
  let html = "";

  if (type === "home") {
    // show summary cards and quick links (matching sidebar)
    html = `<h1>Dashboard</h1>
      <div class="cards-grid">
        <div class="card" onclick="loadContent('services')"><i class="fas fa-concierge-bell"></i><h4>Village Services</h4><p>Apply for certificates & services</p></div>
        <div class="card" onclick="loadContent('applications')"><i class="fas fa-folder-open"></i><h4>My Applications</h4><p>View submitted forms</p></div>
        <div class="card" onclick="loadContent('complaints')"><i class="fas fa-exclamation-circle"></i><h4>Complaints</h4><p>Register grievances</p></div>
        <div class="card" onclick="loadContent('schemes')"><i class="fas fa-gift"></i><h4>Schemes</h4><p>Available govt. schemes</p></div>
        <div class="card" onclick="loadContent('events')"><i class="fas fa-calendar-alt"></i><h4>Events</h4><p>Village events & camps</p></div>
      </div>`;
  }

  else if (type === "services") {
    html = `<h2>Village Services</h2>
      <div class="cards-grid">
        <!-- Panch & Sarpanch Services -->
        <div style="grid-column: 1 / -1;"><h3 style="color:var(--accent); margin-top:10px;"><i class="fas fa-gavel"></i> Panch & Sarpanch Services</h3></div>
        <div class="card" onclick="openService('residence_certificate')"><i class="fas fa-home"></i><div>Residence/Domicile Certificate</div></div>
        <div class="card" onclick="openService('character_certificate')"><i class="fas fa-user-check"></i><div>Character Certificate</div></div>
        <div class="card" onclick="openService('bpl_certificate')"><i class="fas fa-hands-helping"></i><div>BPL Certificate</div></div>
        <div class="card" onclick="openService('noc_building')"><i class="fas fa-building"></i><div>Building Construction NOC</div></div>
        <div class="card" onclick="openService('trade_license')"><i class="fas fa-store"></i><div>Trade/Shop License</div></div>
        <div class="card" onclick="openService('property_tax')"><i class="fas fa-file-invoice-dollar"></i><div>Property Tax Registration</div></div>
        <div class="card" onclick="openService('marriage_cert')"><i class="fas fa-ring"></i><div>Marriage Registration</div></div>
        <div class="card" onclick="openService('cattle_reg')"><i class="fas fa-horse-head"></i><div>Cattle Registration</div></div>
        <div class="card" onclick="openService('family_tree')"><i class="fas fa-users"></i><div>Family Member Certificate</div></div>

        <!-- Local Village-Only Services (Non-Govt) -->
        <div style="grid-column: 1 / -1;"><h3 style="color:var(--accent); margin-top:10px;"><i class="fas fa-leaf"></i> Local Village Requests</h3></div>
        <div class="card" onclick="openService('dispute_resolution')"><i class="fas fa-balance-scale"></i><div>Local Dispute Hearing</div></div>
        <div class="card" onclick="openService('equipment_rental')"><i class="fas fa-tractor"></i><div>Equipment/Tractor Rental</div></div>
        <div class="card" onclick="openService('public_announcement')"><i class="fas fa-bullhorn"></i><div>Public Announcement (Munadi)</div></div>
        <div class="card" onclick="openService('volunteer_work')"><i class="fas fa-hands-helping"></i><div>Shramdaan (Volunteer)</div></div>
        
        <!-- Local Infrastructure Services -->
        <div style="grid-column: 1 / -1;"><h3 style="color:var(--accent); margin-top:10px;"><i class="fas fa-tools"></i> Village Infrastructure Maintenance</h3></div>
        <div class="card" onclick="openService('road_repair')"><i class="fas fa-road"></i><div>Road Repair</div></div>
        <div class="card" onclick="openService('streetlight')"><i class="fas fa-lightbulb"></i><div>Street Light Repair</div></div>
        <div class="card" onclick="openService('drainage')"><i class="fas fa-broom"></i><div>Drainage Cleaning</div></div>
        <div class="card" onclick="openService('garbage')"><i class="fas fa-trash-alt"></i><div>Garbage Collection</div></div>
        <div class="card" onclick="openService('water_tanker')"><i class="fas fa-truck-moving"></i><div>Water Tanker Request</div></div>
        <div class="card" onclick="openService('community_hall')"><i class="fas fa-building"></i><div>Community Hall Booking</div></div>
      </div>
      <div id="serviceArea" style="margin-top:18px"></div>`;
  }

  else if (type === "applications") {
    html = `<h2>My Applications</h2><div id="appsList"></div>`;
    area.innerHTML = html;
    renderApplications();
    return;
  }

  else if (type === "complaints") {
    html = `<h2>Complaints</h2>
      <div class="cards-grid">
        <div class="card" onclick="showComplaintForm()"><i class="fas fa-edit"></i><div>Register Complaint</div></div>
        <div class="card" onclick="renderComplaints()"><i class="fas fa-list"></i><div>View Complaints</div></div>
      </div>
      <div id="complaintArea" style="margin-top:18px"></div>`;
  }

  else if (type === "schemes") {
    const schemes = getSchemeList();
    html = `<h2>Government Schemes</h2>
      <div class="cards-grid">`;

    schemes.forEach(scheme => {
      // Escape single quotes in title and description for onclick
      const safeTitle = scheme.title.replace(/'/g, "\\'");
      const safeDesc = scheme.description.replace(/'/g, "\\'");
      const safeLink = scheme.link || '';
      html += `<div class="card" onclick="openScheme('${safeTitle}','${safeDesc}', '${safeLink}')">
        <i class="${scheme.icon}"></i>
        <h4>${scheme.title}</h4>
        ${scheme.link ? '<small style="color:var(--accent);"><i class="fas fa-external-link-alt"></i> Official Link Available</small>' : ''}
      </div>`;
    });

    html += `</div>`;
  }

  else if (type === "events") {
    html = `<h2>Upcoming Events</h2>
      <div id="eventsArea" style="margin-top:18px">
        <div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent);"></i><p>Loading events...</p></div>
      </div>`;
    area.innerHTML = html;
    loadEventsFromBackend();
    return;
  }

  else if (type === "admin-dashboard") {
    html = `<h2><i class="fas fa-user-shield"></i> Admin Dashboard</h2>
      <div class="cards-grid" style="margin-bottom:24px;">
        <div class="card" onclick="loadContent('admin-tracking')">
          <i class="fas fa-chart-line" style="font-size:32px;color:#f59e0b;"></i>
          <h4>Scheme Tracking</h4>
          <p>View Click Statistics</p>
        </div>
        <div class="card" onclick="loadContent('admin-users')">
          <i class="fas fa-users" style="font-size:32px;color:#10b981;"></i>
          <h4>Applied Users</h4>
          <p>View Registrations</p>
        </div>
        <div class="card" onclick="loadContent('admin-services')">
          <i class="fas fa-concierge-bell" style="font-size:32px;color:#3b82f6;"></i>
          <h4>Village Services</h4>
          <p>Manage Service Types</p>
        </div>
        <div class="card" onclick="loadContent('admin-events')">
          <i class="fas fa-calendar-plus" style="font-size:32px;color:#14b8a6;"></i>
          <h4>Manage Events</h4>
          <p>Post Upcoming Events</p>
        </div>

        <div class="card" onclick="loadContent('admin-complaints')">
          <i class="fas fa-ticket-alt" style="font-size:32px;color:#ec4899;"></i>
          <h4>Ticket System</h4>
          <p>Manage Complaints</p>
        </div>
      </div>`;
  }
  else if (type === "admin-tracking") {
    html = `<h2><i class="fas fa-chart-line"></i> Scheme Click Tracking</h2>
            <div id="adminTrackingArea">
              <div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent);"></i><p>Loading tracking data...</p></div>
            </div>`;
    area.innerHTML = html;
    renderAdminTracking();
    return;
  }
  else if (type === "admin-users") {
    html = `<h2><i class="fas fa-users"></i> Applied Users</h2>
            <div id="adminUsersArea">
              <div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent);"></i><p>Loading user data...</p></div>
            </div>`;
    area.innerHTML = html;
    renderAdminUsers();
    return;
  }
  else if (type === "admin-services") {
    html = `<h2><i class="fas fa-concierge-bell"></i> Manage Village Services</h2>
            <div class="cards-grid" style="margin-bottom:24px;">
              <div class="card"><i class="fas fa-file-alt" style="font-size:32px;color:var(--accent);"></i><h4 id="adminTotalApps">0</h4><p>Total</p></div>
              <div class="card"><i class="fas fa-clock" style="font-size:32px;color:#f59e0b;"></i><h4 id="adminPendingApps">0</h4><p>Pending</p></div>
              <div class="card"><i class="fas fa-check-circle" style="font-size:32px;color:#10b981;"></i><h4 id="adminApprovedApps">0</h4><p>Approved</p></div>
              <div class="card"><i class="fas fa-times-circle" style="font-size:32px;color:#ef4444;"></i><h4 id="adminRejectedApps">0</h4><p>Rejected</p></div>
            </div>
            <div id="adminApplicationsList"></div>`;
    area.innerHTML = html;
    renderAdminApplications();
    return;
  }
  else if (type === "admin-events") {
    html = `<h2><i class="fas fa-calendar-plus"></i> Manage Village Events</h2>
            <div class="card" style="margin-bottom:18px;">
              <h4>Post a New Event</h4>
              <p class="muted" style="margin-bottom:12px;">Admin can announce upcoming village events with date and schedule.</p>
              <div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                <input id="adminEventTitle" class="input" placeholder="Event title (e.g. Gram Sabha Meeting)" />
                <select id="adminEventType" class="input">
                  <option value="">Select event type</option>
                  <option value="meeting">Meeting</option>
                  <option value="health">Health Camp</option>
                  <option value="awareness">Awareness Program</option>
                  <option value="education">Education</option>
                  <option value="culture">Cultural</option>
                  <option value="other">Other</option>
                </select>
                <input id="adminEventDateTime" type="datetime-local" class="input" />
                <input id="adminEventLocation" class="input" placeholder="Location in village" />
              </div>
              <textarea id="adminEventDescription" class="input" rows="3" style="margin-top:10px;" placeholder="Describe what will happen and who should attend"></textarea>
              <div style="margin-top:10px;display:flex;gap:8px;align-items:center;">
                <button class="btn primary" onclick="createAdminEvent()"><i class="fas fa-plus"></i> Post Event</button>
                <span id="adminEventMsg" class="muted small"></span>
              </div>
            </div>
            <div id="adminEventsList"></div>`;
    area.innerHTML = html;
    renderAdminEventsManager();
    return;
  }
  else if (type === "admin-complaints") {
    html = `<h2><i class="fas fa-ticket-alt"></i> Ticket System</h2>
            <div id="adminComplaintsList"></div>`;
    area.innerHTML = html;
    renderAdminComplaints();
    return;
  }

  // Add animation classes to content
  area.style.opacity = '0';
  area.style.transform = 'translateY(20px)';
  area.innerHTML = html;

  // Animate content in
  setTimeout(() => {
    area.style.transition = 'all 0.4s ease-out';
    area.style.opacity = '1';
    area.style.transform = 'translateY(0)';

    // Add stagger animation to cards
    const cards = area.querySelectorAll('.card');
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`;
      card.classList.add('animate-fade-in');
    });
  }, 50);

  // Show follow-up actions after loading dashboard subsections
  if (type !== "home" && type !== "events") {
    setTimeout(() => showDashboardFollowUp(type), 500);
  }
}

/* ---------- services & application submission ---------- */
function openService(type) {
  const area = $("serviceArea");
  if (!area) return;
  // fields definitions: array of {id, label, type, placeholder, required, pattern, maxlength}
  const schema = {
    telemedicine: [
      { id: 'Name', label: 'Patient Name', placeholder: "Enter patient's name", required: true },
      { id: 'Age', label: 'Age', type: 'number', placeholder: "Patient's age", required: true },
      { id: 'Symptoms', label: 'Symptoms', type: 'textarea', placeholder: "Describe symptoms in detail", required: true },
      { id: 'History', label: 'Medical History', type: 'textarea', placeholder: "Any previous conditions/allergies", required: false },
      { id: 'Reports', label: 'Previous Reports', type: 'file', required: false },
      { id: 'Mobile', label: 'Mobile Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    ambulance: [
      { id: 'Name', label: 'Requester Name', placeholder: "Enter your name", required: true },
      { id: 'Location', label: 'Pickup Location', placeholder: "Exact location for pickup", required: true },
      { id: 'Landmark', label: 'Nearby Landmark', placeholder: "Famous landmark near location", required: true },
      { id: 'Condition', label: 'Patient Condition', type: 'textarea', placeholder: "Describe condition (conscious/unconscious, bleeding, etc.)", required: true },
      { id: 'EmergencyType', label: 'Emergency Type', type: 'select', options: ['Medical', 'Accident', 'Pregnancy', 'Other'], required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    seeds: [
      { id: 'FarmerName', label: 'Farmer Name', placeholder: "Enter farmer's name", required: true },
      { id: 'Crop', label: 'Crop Type', type: 'select', options: ['Wheat', 'Rice', 'Maize', 'Vegetables', 'Other'], required: true },
      { id: 'Land', label: 'Land Area (Acres)', type: 'number', step: '0.1', placeholder: "Area in acres", required: true },
      { id: 'Quantity', label: 'Seed Quantity (kg)', type: 'number', placeholder: "Quantity required", required: true },
      { id: 'LandDoc', label: 'Land Document (7/12)', type: 'file', required: true },
      { id: 'Identity', label: 'Identity Proof (Aadhaar)', type: 'file', required: true },
      { id: 'Mobile', label: 'Mobile Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    fertilizer: [
      { id: 'FarmerName', label: 'Farmer Name', placeholder: "Enter farmer's name", required: true },
      { id: 'Type', label: 'Fertilizer Type', type: 'select', options: ['Urea', 'DAP', 'NPK', 'Organic'], required: true },
      { id: 'Bags', label: 'Number of Bags', type: 'number', placeholder: "Quantity in bags", required: true },
      { id: 'LandDoc', label: 'Land Document', type: 'file', required: true },
      { id: 'Aadhaar', label: 'Aadhaar Number', type: 'text', pattern: '^[0-9]{12}$', maxlength: '12', placeholder: "12-digit Aadhaar", required: true },
      { id: 'Mobile', label: 'Mobile Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    scholarship: [
      { id: 'StudentName', label: 'Student Name', placeholder: "Enter student's name", required: true },
      { id: 'Institute', label: 'School/College Name', placeholder: "Current institution", required: true },
      { id: 'Class', label: 'Class/Course', placeholder: "e.g., 10th, 12th, B.Sc", required: true },
      { id: 'Income', label: 'Annual Family Income (₹)', type: 'number', placeholder: "Family income", required: true },
      { id: 'Category', label: 'Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST'], required: true },
      { id: 'MarkSheet', label: 'Previous Year Mark Sheet', type: 'file', required: true },
      { id: 'IncomeCert', label: 'Income Certificate', type: 'file', required: true },
      { id: 'Photo', label: 'Student Photo', type: 'file', required: true },
      { id: 'Mobile', label: 'Mobile Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    library: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Enter your full name", required: true },
      { id: 'Age', label: 'Age', type: 'number', placeholder: "Your age", required: true },
      { id: 'Occupation', label: 'Occupation', type: 'select', options: ['Student', 'Professional', 'Retired', 'Other'], required: true },
      { id: 'Address', label: 'Residential Address', placeholder: "Complete address", required: true },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Photo', label: 'Passport Size Photo', type: 'file', required: true },
      { id: 'Mobile', label: 'Mobile Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    road_repair: [
      { id: 'Name', label: 'Requestor Name', placeholder: "Enter your full name", required: true },
      { id: 'Location', label: 'Road Location', placeholder: "Road name or landmark", required: true },
      { id: 'DetailedLoc', label: 'Detailed Location', type: 'textarea', placeholder: "More details about the location", required: false },
      { id: 'Damage', label: 'Damage Description', type: 'select', options: ['Potholes', 'Broken Surface', 'Water Logging', 'Other'], required: true },
      { id: 'Severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], required: true },
      { id: 'Photo', label: 'Photo of Damage', type: 'file', required: false },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    streetlight: [
      { id: 'Name', label: 'Requestor Name', placeholder: "Enter your full name", required: true },
      { id: 'PoleNo', label: 'Pole Number (if visible)', placeholder: "Pole Number", required: false },
      { id: 'Location', label: 'Location/Landmark', placeholder: "Near School/Temple etc.", required: true },
      { id: 'Issue', label: 'Issue Description', type: 'select', options: ['Not Working', 'Blinking', 'Broken', 'New Request'], required: true },
      { id: 'Photo', label: 'Photo of Pole', type: 'file', required: false },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    drainage: [
      { id: 'Name', label: 'Requestor Name', placeholder: "Enter your full name", required: true },
      { id: 'Location', label: 'Location/Street', placeholder: "Street name or landmark", required: true },
      { id: 'Issue', label: 'Issue Type', type: 'select', options: ['Blocked', 'Overflowing', 'Damaged', 'Cleaning Required'], required: true },
      { id: 'Photo', label: 'Photo of Issue', type: 'file', required: false },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    garbage: [
      { id: 'Name', label: 'Requestor Name', placeholder: "Enter your full name", required: true },
      { id: 'Location', label: 'Collection Point', placeholder: "Address or landmark", required: true },
      { id: 'Type', label: 'Waste Type', type: 'select', options: ['Household', 'Construction Debris', 'Community Waste'], required: true },
      { id: 'Volume', label: 'Estimated Volume', type: 'select', options: ['Small (1-2 bags)', 'Medium (Rickshaw load)', 'Large (Tractor load)'], required: true },
      { id: 'Photo', label: 'Photo of Spot', type: 'file', required: false },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    water_tanker: [
      { id: 'Name', label: 'Requestor Name', placeholder: "Enter your full name", required: true },
      { id: 'Address', label: 'Delivery Address', placeholder: "Complete address", required: true },
      { id: 'Quantity', label: 'Quantity Required (Litres)', type: 'select', options: ['1000L', '2000L', '5000L'], required: true },
      { id: 'Date', label: 'Date Required', type: 'date', required: true },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    community_hall: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Enter your full name", required: true },
      { id: 'Event', label: 'Event Type', type: 'select', options: ['Wedding', 'Meeting', 'Function', 'Other'], required: true },
      { id: 'Details', label: 'Event Details', type: 'textarea', placeholder: "Describe the event purpose and approximate guests", required: true },
      { id: 'Date', label: 'Booking Date', type: 'date', required: true },
      { id: 'Duration', label: 'Duration (Hours)', type: 'number', placeholder: "Number of hours", required: true },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    // New Certificate Services
    birth_certificate: [
      { id: 'ChildName', label: 'Child Name', placeholder: "Full name of the child", required: true },
      { id: 'DOB', label: 'Date of Birth', type: 'date', required: true },
      { id: 'Gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { id: 'FatherName', label: 'Father\'s Name', placeholder: "Full name of father", required: true },
      { id: 'MotherName', label: 'Mother\'s Name', placeholder: "Full name of mother", required: true },
      { id: 'Place', label: 'Place of Birth', placeholder: "Hospital or Home Address", required: true },
      { id: 'HospitalDoc', label: 'Hospital Discharge Slip / Proof of Birth', type: 'file', required: true },
      { id: 'AddressProof', label: 'Parents\' Address Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    death_certificate: [
      { id: 'DeceasedName', label: 'Deceased Person\'s Name', placeholder: "Full name", required: true },
      { id: 'DOD', label: 'Date of Death', type: 'date', required: true },
      { id: 'Place', label: 'Place of Death', placeholder: "Hospital or Home Address", required: true },
      { id: 'Reason', label: 'Reason of Death', placeholder: "Cause of death", required: true },
      { id: 'ApplicantRel', label: 'Applicant Relationship', type: 'select', options: ['Son', 'Daughter', 'Spouse', 'Other'], required: true },
      { id: 'DoctorCert', label: 'Doctor\'s Certificate', type: 'file', required: true },
      { id: 'CremationReceipt', label: 'Cremation/Burial Receipt', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    income_certificate: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Full name", required: true },
      { id: 'Occupation', label: 'Occupation', placeholder: "Current occupation", required: true },
      { id: 'AnnualIncome', label: 'Annual Family Income (₹)', type: 'number', required: true },
      { id: 'Purpose', label: 'Purpose', type: 'select', options: ['Education', 'Govt Scheme', 'Loan', 'Other'], required: true },
      { id: 'IncomeProof', label: 'Income Proof (Salary Slip/Affidavit)', type: 'file', required: true },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    caste_certificate: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Full name", required: true },
      { id: 'Caste', label: 'Caste Category', type: 'select', options: ['SC', 'ST', 'OBC', 'EWS'], required: true },
      { id: 'SubCaste', label: 'Sub-Caste', placeholder: "Sub-caste name", required: true },
      { id: 'FatherName', label: 'Father\'s Name', placeholder: "Full name", required: true },
      { id: 'CasteProof', label: 'Caste Proof (Blood Relative Certificate)', type: 'file', required: true },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    residence_certificate: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Full name", required: true },
      { id: 'Duration', label: 'Duration of Stay (Years)', type: 'number', required: true },
      { id: 'FatherName', label: 'Father\'s Name', placeholder: "Full name", required: true },
      { id: 'Address', label: 'Complete Address', type: 'textarea', placeholder: "House No, Street, Village", required: true },
      { id: 'UtilityBill', label: 'Utility Bill (Electricity/Water)', type: 'file', required: true },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    character_certificate: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Full name", required: true },
      { id: 'Purpose', label: 'Purpose of Certificate', placeholder: "E.g., Job, Further Education", required: true },
      { id: 'FatherName', label: 'Father\'s Name', placeholder: "Full name", required: true },
      { id: 'Address', label: 'Complete Address', type: 'textarea', placeholder: "Your village address", required: true },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    bpl_certificate: [
      { id: 'Name', label: 'Head of Family Name', placeholder: "Full name", required: true },
      { id: 'FamilyMembers', label: 'Number of Family Members', type: 'number', required: true },
      { id: 'AnnualIncome', label: 'Annual Income (₹)', type: 'number', required: true },
      { id: 'Address', label: 'Complete Address', type: 'textarea', required: true },
      { id: 'RationCard', label: 'Existing Ration Card (if any)', type: 'file', required: false },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    noc_building: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Full name", required: true },
      { id: 'ConstructionType', label: 'Type of Construction', type: 'select', options: ['Residential', 'Commercial', 'Agricultural'], required: true },
      { id: 'PlotArea', label: 'Plot Area (Sq. Ft.)', type: 'number', required: true },
      { id: 'LandDoc', label: 'Land Ownership Document (7/12)', type: 'file', required: true },
      { id: 'PlanCopy', label: 'Building Plan Copy (if any)', type: 'file', required: false },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    trade_license: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Full name", required: true },
      { id: 'ShopName', label: 'Shop/Business Name', placeholder: "Name of the business", required: true },
      { id: 'BusinessType', label: 'Business Type', type: 'select', options: ['Grocery', 'Hardware', 'Clothing', 'Eatery', 'Other'], required: true },
      { id: 'Location', label: 'Shop Location', type: 'textarea', placeholder: "Detailed village address", required: true },
      { id: 'Identity', label: 'Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    property_tax: [
      { id: 'Name', label: 'Owner Name', placeholder: "Full name", required: true },
      { id: 'PropertyType', label: 'Property Type', type: 'select', options: ['Residential', 'Commercial', 'Agricultural Land'], required: true },
      { id: 'Area', label: 'Total Area (Sq.Ft)', type: 'number', required: true },
      { id: 'Address', label: 'Property Address', type: 'textarea', required: true },
      { id: 'LandDoc', label: 'Land Document / Title Deed', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    marriage_cert: [
      { id: 'HusbandName', label: 'Husband\'s Name', placeholder: "Full name", required: true },
      { id: 'WifeName', label: 'Wife\'s Name', placeholder: "Full name", required: true },
      { id: 'Date', label: 'Date of Marriage', type: 'date', required: true },
      { id: 'Location', label: 'Location of Marriage', placeholder: "Venue or village name", required: true },
      { id: 'Photos', label: 'Marriage Photos', type: 'file', required: true },
      { id: 'IdProof', label: 'ID Proofs of Both', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    cattle_reg: [
      { id: 'Name', label: 'Owner Name', placeholder: "Full name", required: true },
      { id: 'AnimalType', label: 'Type of Animal', type: 'select', options: ['Cow', 'Buffalo', 'Goat', 'Sheep', 'Other'], required: true },
      { id: 'Count', label: 'Number of Animals', type: 'number', required: true },
      { id: 'Breed', label: 'Breed Details (if any)', placeholder: "Breed name", required: false },
      { id: 'Photo', label: 'Photo of Animals', type: 'file', required: false },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    family_tree: [
      { id: 'HeadName', label: 'Family Head Name', placeholder: "Full name", required: true },
      { id: 'TotalMembers', label: 'Total Members in Family', type: 'number', required: true },
      { id: 'Details', label: 'Names & Relations', type: 'textarea', placeholder: "E.g., 1. Suresh (Self), 2. Ramesh (Son)", required: true },
      { id: 'RationCard', label: 'Ration Card Copy', type: 'file', required: true },
      { id: 'Identity', label: 'Head\'s Identity Proof', type: 'file', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', placeholder: "10-digit mobile", required: true }
    ],
    dispute_resolution: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Full name", required: true },
      { id: 'OpposingParty', label: 'Opposing Party Name(s)', placeholder: "Name of the other party involved", required: true },
      { id: 'DisputeType', label: 'Nature of Dispute', type: 'select', options: ['Property/Land Boundary', 'Financial/Transaction', 'Family/Personal', 'Livestock/Farming', 'Other'], required: true },
      { id: 'Description', label: 'Brief Description', type: 'textarea', placeholder: "Describe the issue briefly for the Panch", required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', required: true }
    ],
    equipment_rental: [
      { id: 'Name', label: 'Applicant Name', placeholder: "Full name", required: true },
      { id: 'Equipment', label: 'Equipment Needed', type: 'select', options: ['Panchayat Tractor', 'Water Pump', 'Thresher', 'Tents/Chairs for function'], required: true },
      { id: 'DurationDays', label: 'Duration (Days/Hours)', type: 'number', required: true },
      { id: 'DateNeeded', label: 'Date Required', type: 'date', required: true },
      { id: 'Purpose', label: 'Purpose', type: 'textarea', placeholder: "Why is the equipment needed?", required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', required: true }
    ],
    public_announcement: [
      { id: 'Name', label: 'Requestor Name', placeholder: "Full name", required: true },
      { id: 'Type', label: 'Announcement Type', type: 'select', options: ['Lost Item', 'Found Item', 'Local Event/Ceremony', 'Meeting', 'Other'], required: true },
      { id: 'Message', label: 'Message to Announce', type: 'textarea', placeholder: "Exact message for the Munadi / loudspeaker", required: true },
      { id: 'Date', label: 'Date of Announcement', type: 'date', required: true },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', required: true }
    ],
    volunteer_work: [
      { id: 'Name', label: 'Volunteer Name', placeholder: "Full name", required: true },
      { id: 'Skillset', label: 'Skills / Area of Interest', type: 'select', options: ['Teaching/Tutoring', 'Cleaning/Sanitation', 'Tree Plantation', 'Event Management', 'General Physical Labor'], required: true },
      { id: 'Availability', label: 'Availability', type: 'select', options: ['Weekends', 'Evenings', 'Anytime (Flexible)', 'Specific Events Only'], required: true },
      { id: 'Comments', label: 'Any specific tools/equipment you can bring?', type: 'textarea', required: false },
      { id: 'Mobile', label: 'Contact Number', type: 'tel', pattern: '^[6-9][0-9]{9}$', maxlength: '10', required: true }
    ]
  };
  const fields = schema[type];
  if (!fields) { area.innerHTML = "<p>Form not available.</p>"; return; }

  let html = `<div style="background:#fff;padding:20px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
    <h3 style="color:var(--accent);margin-bottom:20px;"><i class="fas fa-file-alt"></i> ${capitalize(type)} Application Form</h3>`;

  fields.forEach(f => {
    const inputType = f.type || 'text';
    const inputId = `app_${type}_${f.id}`;
    const required = f.required !== false;
    const requiredAttr = required ? 'required' : '';
    const patternAttr = f.pattern ? `pattern="${f.pattern}"` : '';
    const maxlengthAttr = f.maxlength ? `maxlength="${f.maxlength}"` : '';
    const minAttr = f.min ? `min="${f.min}"` : '';
    const stepAttr = f.step ? `step="${f.step}"` : '';
    const placeholder = f.placeholder || f.label;


    if (f.type === 'select') {
      html += `
        <label style="display:block;margin-top:12px;margin-bottom:6px;font-weight:500;text-align:left;color:#111827;">
          ${f.label}${required ? ' <span style="color:#ef4444;">*</span>' : ''}
        </label>
        <select id="${inputId}" ${requiredAttr} style="width:100%;padding:10px;border:1px solid #e6e9ee;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;">
          <option value="">Select ${f.label}</option>
          ${f.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
      `;
    } else if (f.type === 'textarea') {
      html += `
        <label style="display:block;margin-top:12px;margin-bottom:6px;font-weight:500;text-align:left;color:#111827;">
          ${f.label}${required ? ' <span style="color:#ef4444;">*</span>' : ''}
        </label>
        <textarea id="${inputId}" placeholder="${placeholder}" ${requiredAttr} rows="3"
               style="width:100%;padding:10px;border:1px solid #e6e9ee;border-radius:8px;font-family:inherit;resize:vertical;"></textarea>
      `;
    } else if (f.type === 'file') {
      html += `
        <label style="display:block;margin-top:12px;margin-bottom:6px;font-weight:500;text-align:left;color:#111827;">
          ${f.label}${required ? ' <span style="color:#ef4444;">*</span>' : ''}
        </label>
        <input id="${inputId}" type="file" ${requiredAttr} 
               style="width:100%;padding:10px;border:1px solid #e6e9ee;border-radius:8px;font-family:inherit;background:#fff;">
        <small style="display:block;margin-top:4px;color:#6b7280;font-size:12px;">Allowed: JPG, PNG, PDF (Max 2MB)</small>
      `;
    } else {
      html += `
        <label style="display:block;margin-top:12px;margin-bottom:6px;font-weight:500;text-align:left;color:#111827;">
          ${f.label}${required ? ' <span style="color:#ef4444;">*</span>' : ''}
        </label>
        <input id="${inputId}" type="${inputType}" placeholder="${placeholder}" 
               ${requiredAttr} ${patternAttr} ${maxlengthAttr} ${minAttr} ${stepAttr}
               style="width:100%;padding:10px;border:1px solid #e6e9ee;border-radius:8px;font-family:inherit;">
      `;
    }
  });

  html += `
    <div style="margin-top:20px;padding:12px;background:#f0f9ff;border-left:4px solid var(--accent);border-radius:4px;text-align:left;">
      <p style="margin:0;font-size:12px;color:#111827;">
        <i class="fas fa-info-circle"></i> <strong>Note:</strong> Please ensure all information is accurate. False information may lead to rejection.
      </p>
    </div>
    <div style="margin-top:20px;display:flex;gap:10px;">
      <button class="btn primary" onclick="submitService('${type}')" style="flex:1;">
        <i class="fas fa-paper-plane"></i> Submit Application
      </button>
      <button class="btn ghost" onclick="document.getElementById('serviceArea').innerHTML=''" style="flex:1;">
        <i class="fas fa-times"></i> Clear Form
      </button>
    </div>
  </div>`;

  area.innerHTML = html;

  // Focus on first input
  setTimeout(() => {
    const firstInput = area.querySelector('input, select');
    if (firstInput) firstInput.focus();
  }, 100);
}

function submitService(type) {
  const user = sessionStorage.getItem("sp_user") || 'guest';
  // collect inputs and selects in serviceArea
  const inputs = [...document.querySelectorAll("#serviceArea input, #serviceArea select")];
  const fields = {};
  inputs.forEach(i => {
    if (i.type === 'file') {
      if (i.files.length > 0) {
        fields[i.id] = i.files[0].name + " (Uploaded)";
      }
    } else if (i.value.trim() !== '') {
      fields[i.id] = i.value;
    }
  });

  // basic validation - ensure non-empty fields
  const values = Object.values(fields);
  if (values.some(v => v === null || v === undefined || String(v).trim() === '')) {
    alert("Please fill all fields before submitting.");
    return;
  }

  // Try to find a name field for applicantName, otherwise use user
  const applicantName = fields.Name || fields.Child || fields.DecName || fields.Groom || user;

  // Call API to save application
  fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicantName,
      scheme: type,
      details: fields,
      username: user
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Show success modal
        showSuccessModal(
          `${capitalize(type)} Application Submitted!`,
          `Your ${capitalize(type)} application has been submitted successfully. Our team will review it and update the status soon.`,
          `Application ID: ${data.applicationId}`
        );

        // clear form
        document.querySelectorAll("#serviceArea input").forEach(i => i.value = '');
      } else {
        alert('Failed to submit application: ' + (data.message || 'Unknown error'));
      }
    })
    .catch(err => {
      console.error('Submit application error:', err);
      alert('Server error. Please try again later.');
    });
}

let userApplications = [];

/* ---------- render applications for current user ---------- */
function renderApplications() {
  const area = $("appsList");
  if (!area) return;
  const user = sessionStorage.getItem("sp_user") || 'guest';

  area.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  fetch(`/api/applications?username=${encodeURIComponent(user)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        area.innerHTML = '<p class="error">Failed to load applications.</p>';
        return;
      }

      const apps = data.applications || [];
      userApplications = apps; // Cache for details view

      if (!apps.length) {
        area.innerHTML = `<div style="text-align:center;padding:40px;">
          <i class="fas fa-folder-open" style="font-size:48px;color:var(--muted);margin-bottom:16px;"></i>
          <p style="color:var(--muted);">No applications yet. Apply for services or schemes to get started.</p>
        </div>`;
        return;
      }

      let html = `<div style="margin-bottom:16px;">
        <strong>Total Applications: ${apps.length}</strong> | 
        Pending: ${apps.filter(a => a.status === 'Pending').length} | 
        Approved: ${apps.filter(a => a.status === 'Approved').length}
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;">
          <tr>
            <th>Application ID</th>
            <th>Scheme/Service</th>
            <th>Submitted Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>`;

      apps.forEach(a => {
        const statusColor = {
          'Pending': '#f59e0b',
          'Approved': '#10b981',
          'Rejected': '#ef4444',
          'Under Review': '#3b82f6',
          'Under Process': '#3b82f6'
        }[a.status] || '#6b7280';

        const dateStr = new Date(a.submittedAt).toLocaleString('en-IN');

        html += `<tr style="animation:fadeIn 0.3s ease-out;">
          <td><code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;font-size:12px;">${a._id}</code></td>
          <td><strong>${a.scheme ? a.scheme.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown'}</strong></td>
          <td>${dateStr}</td>
          <td>
            <span style="background:${statusColor}20;color:${statusColor};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${a.status}</span>
            ${a.adminRemark ? `<div style="font-size:11px;color:#6b7280;margin-top:6px;max-width:200px;">💬 ${a.adminRemark}</div>` : ''}
          </td>
          <td>
            <button class="btn small ghost" onclick="viewApplicationDetails('${a._id}')" title="View Details">
              <i class="fas fa-eye"></i> View
            </button>
          </td>
        </tr>`;
      });

      html += `</table></div>`;
      area.innerHTML = html;
    })
    .catch(err => {
      console.error('Error fetching applications:', err);
      area.innerHTML = '<p class="error">Server error. Could not load applications.</p>';
    });
}

function viewApplicationDetails(appId) {
  const app = userApplications.find(a => a._id === appId);
  if (!app) return;

  const dateStr = new Date(app.submittedAt).toLocaleString('en-IN');
  // flattened details for display
  const details = app.details || {};

  let detailsHtml = `
    <div style="text-align:left;max-width:600px;">
      <h3 style="margin-bottom:16px;color:var(--accent);">${app.scheme ? app.scheme.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown'}</h3>
      <div style="background:#f9fafb;padding:16px;border-radius:8px;margin-bottom:16px;">
        <p><strong>Application ID:</strong> <code>${app._id}</code></p>
        <p><strong>Status:</strong> <span style="color:${app.status === 'Approved' ? '#10b981' : app.status === 'Rejected' ? '#ef4444' : app.status === 'Under Process' ? '#3b82f6' : '#f59e0b'};font-weight:600;">${app.status}</span></p>
        ${app.adminRemark ? `<p style="margin-top:8px;padding:8px;background:#f3f4f6;border-left:3px solid var(--accent);"><strong>Admin Remark:</strong> ${app.adminRemark}</p>` : ''}
        <p><strong>Submitted Date:</strong> ${dateStr}</p>
        <p><strong>Applicant Name:</strong> ${app.applicantName}</p>
      </div>
      <h4 style="margin-top:20px;margin-bottom:12px;">Application Details:</h4>
      <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e5e7eb;">
        ${Object.entries(details).filter(([k]) => k !== 'user').map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    return `<p style="margin:8px 0;"><strong>${label}:</strong> ${value || '-'}</p>`;
  }).join('')}
      </div>
    </div>
  `;

  $("successTitle").innerText = 'Application Details';
  $("successMessage").innerHTML = detailsHtml;
  $("successAppId").innerText = '';
  $("successViewBtn").style.display = 'none';
  $("successViewBtn").nextElementSibling.innerText = 'Close';
  $("successModalLayer").classList.remove("hidden");
}

function renderAdminUserStats() {
  const area = $("adminUserStats");
  if (!area) return;

  area.innerHTML = '<div style="text-align:center;padding:10px;"><i class="fas fa-spinner fa-spin"></i> Loading stats...</div>';

  fetch('/api/admin/users/stats')
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        area.innerHTML = '<p class="error">Failed to load user stats.</p>';
        return;
      }

      const viewers = data.viewers || [];
      const applicants = data.applicants || [];

      let html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <!-- Viewers Only -->
        <div style="background:#fff;padding:16px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
          <h4 style="color:#f59e0b;margin-bottom:12px;border-bottom:2px solid #fef3c7;padding-bottom:8px;">
            <i class="fas fa-eye"></i> Schemes Viewers Only (${viewers.length})
          </h4>
          <p class="muted small" style="margin-bottom:12px">Users who checked schemes but haven't applied yet.</p>
          ${viewers.length === 0 ? '<p class="muted">No users in this category.</p>' :
          `<div style="max-height:200px;overflow-y:auto;">
              <table style="width:100%;font-size:13px;">
                <thead><tr style="background:#f9fafb;"><th style="padding:4px;">User</th><th style="padding:4px;">Phone</th></tr></thead>
                <tbody>
                  ${viewers.map(u => `<tr>
                    <td style="padding:4px;border-bottom:1px solid #f3f4f6;">${u.username}</td>
                    <td style="padding:4px;border-bottom:1px solid #f3f4f6;">${u.phone}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>`
        }
        </div>
        
        <!-- Applicants -->
        <div style="background:#fff;padding:16px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">
          <h4 style="color:#10b981;margin-bottom:12px;border-bottom:2px solid #d1fae5;padding-bottom:8px;">
            <i class="fas fa-check-circle"></i> Active Applicants (${applicants.length})
          </h4>
          <p class="muted small" style="margin-bottom:12px">Users who have submitted applications.</p>
          ${applicants.length === 0 ? '<p class="muted">No applicants found.</p>' :
          `<div style="max-height:200px;overflow-y:auto;">
              <table style="width:100%;font-size:13px;">
                <thead><tr style="background:#f9fafb;"><th style="padding:4px;">User</th><th style="padding:4px;">Apps</th></tr></thead>
                <tbody>
                  ${applicants.map(u => `<tr>
                    <td style="padding:4px;border-bottom:1px solid #f3f4f6;">${u.username}</td>
                    <td style="padding:4px;border-bottom:1px solid #f3f4f6;text-align:center;">
                      <span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:10px;font-weight:600;">${u.applicationCount}</span>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>`
        }
        </div>
      </div>`;

      area.innerHTML = html;
    })
    .catch(err => {
      console.error("Error loading admin stats:", err);
      area.innerHTML = '<p class="error">Error loading statistics.</p>';
    });
}

function renderAdminTracking() {
  const area = $("adminTrackingArea");
  if (!area) return;

  area.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
      <h3 style="margin:0;">Scheme Click Tracking</h3>
      <button class="btn" onclick="renderAdminTracking()"><i class="fas fa-sync"></i> Refresh Data</button>
    </div>
    <div id="trackingLoader" style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary)"></i></div>
  `;

  fetch('/api/admin/scheme-tracking')
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.message || 'Failed to fetch tracking data');

      const stats = data.stats;
      if (!stats || stats.length === 0) {
        area.innerHTML += '<p style="text-align:center; color:#64748b; padding:20px; background:white; border-radius:8px;">No tracking data available yet. Users need to view or apply for schemes first.</p>';
        return;
      }

      // Hide loader
      const loader = document.getElementById('trackingLoader');
      if (loader) loader.style.display = 'none';

      let html = `<div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Scheme Name</th>
              <th>Total Clicks</th>
              <th>Viewed By (Names)</th>
              <th>Applied By (Names)</th>
            </tr>
          </thead>
          <tbody>`;

      stats.forEach(s => {
        // Format viewed by
        let viewedNames = '<span style="color:#94a3b8; font-style:italic;">None</span>';
        if (s.viewedBy && s.viewedBy.length > 0) {
          const uniqueViewers = [...new Set(s.viewedBy)];
          viewedNames = uniqueViewers.map(name => `<span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px; margin:2px; font-size:12px;">${name}</span>`).join(' ');
        }

        // Format applied by
        let appliedNames = '<span style="color:#94a3b8; font-style:italic;">None</span>';
        if (s.appliedBy && s.appliedBy.length > 0) {
          const uniqueApplicants = [...new Set(s.appliedBy)];
          appliedNames = uniqueApplicants.map(name => `<span style="display:inline-block; background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:12px; margin:2px; font-size:12px;">${name}</span>`).join(' ');
        }

        html += `
          <tr>
            <td style="font-weight:500; color:#1e293b;">${s.schemeName}</td>
            <td style="font-weight:bold; color:var(--primary);">${s.clicks || 0}</td>
            <td style="max-width:300px;">${viewedNames}</td>
            <td style="max-width:300px;">${appliedNames}</td>
          </tr>
        `;
      });

      html += `</tbody></table></div>`;
      area.innerHTML += html;
    })
    .catch(err => {
      console.error('Tracking fetch error:', err);
      area.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
          <h3 style="margin:0;">Scheme Click Tracking</h3>
          <button class="btn" onclick="renderAdminTracking()"><i class="fas fa-sync"></i> Refresh Data</button>
        </div>
        <div style="background:#fee2e2; color:#b91c1c; padding:15px; border-radius:8px; display:flex; align-items:center;">
          <i class="fas fa-exclamation-circle" style="margin-right:10px; font-size:20px;"></i>
          <div>
            <strong>Error loading data</strong>
            <p style="margin:5px 0 0 0; font-size:14px;">Ensure the backend server is running and the SchemeStats model is implemented correctly.</p>
          </div>
        </div>
      `;
    });
}

function renderAdminUsers() {
  const area = $("adminUsersArea");
  if (!area) return;
  fetch('/api/admin/users')
    .then(res => res.json())
    .then(data => {
      if (data.success && data.users && data.users.length > 0) {
        let table = `<table class="admin-table">
          <tr><th>Username</th><th>Email</th><th>Phone</th><th>Joined</th></tr>`;
        data.users.forEach(u => {
          const joined = new Date(u.createdAt).toLocaleDateString();
          table += `<tr>
            <td>${u.username}</td>
            <td>${u.email || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td>${joined}</td>
          </tr>`;
        });
        table += '</table>';
        area.innerHTML = table;
      } else {
        area.innerHTML = '<p class="muted">No users found.</p>';
      }
    })
    .catch(err => {
      console.error("Error loading users:", err);
      area.innerHTML = '<p class="error">Failed to load users.</p>';
    });
}

/* ---------- admin applications management ---------- */
function renderAdminApplications() {
  const area = $("adminApplicationsList");
  if (!area) return;

  area.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading applications...</div>';

  fetch('/api/admin/applications', {
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        area.innerHTML = `< p class= "error" > ${data.message || 'Failed to load applications'}</p > `;
        return;
      }

      const validVillageServices = [
        'residence_certificate', 'character_certificate', 'bpl_certificate', 'noc_building', 'trade_license',
        'property_tax', 'marriage_cert', 'cattle_reg', 'family_tree', 'dispute_resolution', 'equipment_rental',
        'public_announcement', 'volunteer_work', 'road_repair', 'streetlight', 'drainage', 'garbage',
        'water_tanker', 'community_hall'
      ];
      const apps = (data.applications || []).filter(a => validVillageServices.includes(a.scheme));
      // Cache for details view if needed, or simply pass ID to viewApplicationDetails
      // If viewApplicationDetails relies on userApplications global, we might need to update it or fetch details individually.
      // For now, let's update userApplications so viewApplicationDetails works for admin too if it uses that.
      // However, viewApplicationDetails currently looks at userApplications which is set by renderApplications (user view).
      // We should probably update viewApplicationDetails to handle looking up from a comprehensive list or fetching.
      // For this fix, let's just make sure we populate a list that viewApplicationDetails can access, 
      // OR update viewApplicationDetails to take an object. 
      // Let's rely on the existing pattern: update a global or passed data.
      // We will re-use userApplications global for simplicity as it acts as a "current view cache".
      userApplications = apps;

      // Update stats
      const totalApps = apps.length;
      const pendingApps = apps.filter(a => a.status === 'Pending').length;
      const approvedApps = apps.filter(a => a.status === 'Approved').length;
      const rejectedApps = apps.filter(a => a.status === 'Rejected').length;

      const totalEl = $("adminTotalApps");
      const pendingEl = $("adminPendingApps");
      const approvedEl = $("adminApprovedApps");
      const rejectedEl = $("adminRejectedApps");

      if (totalEl) totalEl.innerText = totalApps;
      if (pendingEl) pendingEl.innerText = pendingApps;
      if (approvedEl) approvedEl.innerText = approvedApps;
      if (rejectedEl) rejectedEl.innerText = rejectedApps;

      if (!apps.length) {
        area.innerHTML = `< div style = "text-align:center;padding:40px;" >
          <i class="fas fa-folder-open" style="font-size:48px;color:var(--muted);margin-bottom:16px;"></i>
          <p style="color:var(--muted);">No applications found.</p>
        </div > `;
        return;
      }

      let html = `< div style = "overflow-x:auto;" >
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f3f4f6;border-bottom:2px solid #e5e7eb;">
              <th style="padding:12px;text-align:left;">Application ID</th>
              <th style="padding:12px;text-align:left;">User</th>
              <th style="padding:12px;text-align:left;">Service/Type</th>
              <th style="padding:12px;text-align:left;">Submitted Date</th>
              <th style="padding:12px;text-align:left;">Status</th>
              <th style="padding:12px;text-align:left;">Actions</th>
            </tr>
          </thead>
          <tbody>`;

      apps.forEach(a => {
        const statusColor = {
          'Pending': '#f59e0b',
          'Approved': '#10b981',
          'Rejected': '#ef4444',
          'Under Review': '#3b82f6',
          'Under Process': '#3b82f6'
        }[a.status] || '#6b7280';

        const dateStr = new Date(a.submittedAt).toLocaleString('en-IN');
        // Handle scheme name differences and format snake_case gracefully
        const schemeName = a.scheme ? a.scheme.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown';
        // Handle user field (API puts it in details.user, or we might need to populate it on backend)
        // The backend /api/applications endpoint stores user in `details.user`.
        const userName = a.details?.user || 'Unknown';

        html += `<tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:12px;"><code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;font-size:12px;">${a._id}</code></td>
          <td style="padding:12px;"><strong>${userName}</strong></td>
          <td style="padding:12px;"><strong>${schemeName}</strong></td>
          <td style="padding:12px;">${dateStr}</td>
          <td style="padding:12px;">
            <span style="background:${statusColor}20;color:${statusColor};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${a.status}</span>
          </td>
          <td style="padding:12px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn small ghost" onclick="viewApplicationDetails('${a._id}')" title="View Details">
                <i class="fas fa-eye"></i> View
              </button>
              ${a.status === 'Pending' ? `
                <button class="btn small primary" onclick="updateApplicationStatus('${a._id}', 'Approved')" title="Approve">
                  <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn small" style="background:#3b82f6;color:white;" onclick="updateApplicationStatus('${a._id}', 'Under Process')" title="Mark Under Process">
                  <i class="fas fa-spinner"></i> Process
                </button>
                <button class="btn small danger" onclick="updateApplicationStatus('${a._id}', 'Rejected')" title="Reject">
                  <i class="fas fa-times"></i> Reject
                </button>
              ` : ''}
              ${a.status === 'Under Process' ? `
                <button class="btn small primary" onclick="updateApplicationStatus('${a._id}', 'Approved')" title="Approve">
                  <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn small danger" onclick="updateApplicationStatus('${a._id}', 'Rejected')" title="Reject">
                  <i class="fas fa-times"></i> Reject
                </button>
              ` : ''}
              ${a.status === 'Approved' ? `
                 <button class="btn small danger" onclick="updateApplicationStatus('${a._id}', 'Rejected')" title="Reject">
                  <i class="fas fa-times"></i> Reject
                </button>
              ` : ''}
               ${a.status === 'Rejected' ? `
                 <button class="btn small primary" onclick="updateApplicationStatus('${a._id}', 'Approved')" title="Approve">
                  <i class="fas fa-check"></i> Approve
                </button>
              ` : ''}
            </div>
          </td>
        </tr>`;
      });

      html += `</tbody></table></div > `;
      area.innerHTML = html;
    })
    .catch(err => {
      console.error('Error fetching admin applications:', err);
      area.innerHTML = '<p class="error">Server error. Could not load applications.</p>';
    });
}

function updateApplicationStatus(appId, status) {
  if (!confirm(`Are you sure you want to ${status.toLowerCase()} this application?`)) {
    return;
  }

  const remark = prompt(`Add an optional reason or remark for marking as ${status}:`);

  fetch(`/api/admin/applications/${appId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, message: remark })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`Application ${status.toLowerCase()} successfully!`);
        renderAdminApplications();
      } else {
        alert('Failed to update status: ' + (data.message || 'Unknown error'));
      }
    })
    .catch(err => {
      console.error('Update status error:', err);
      alert('Server error. Please try again.');
    });
}

/* ---------- complaints ---------- */
function showComplaintForm() {
  const area = $("complaintArea");
  if (!area) return;
  area.innerHTML = `<h3>Register Complaint</h3>
    <input id="cName" placeholder="Your Name">
    <input id="cType" placeholder="Complaint Type (Water/Road/etc)">
    <textarea id="cText" placeholder="Describe the issue..."></textarea>
    <div style="margin-top:10px"><button class="btn primary" onclick="submitComplaint()">Submit Complaint</button></div>
    <p id="cMsg" class="muted"></p>`;
}

function submitComplaint() {
  const name = $("cName")?.value?.trim();
  const type = $("cType")?.value?.trim();
  const text = $("cText")?.value?.trim();
  if (!name || !type || !text) { $("cMsg").innerText = "Please fill all fields."; return; }

  const user = sessionStorage.getItem("sp_user") || 'guest';
  fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicantName: name, type, description: text, username: user })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        $("cName").value = $("cType").value = $("cText").value = '';
        showSuccessModal(
          "Complaint Registered!",
          `Your complaint regarding "${type}" has been registered successfully.`,
          `Ticket ID: ${data.complaintId}`
        );
      } else {
        $("cMsg").innerText = data.message || "Failed to submit.";
      }
    })
    .catch(err => { console.error(err); $("cMsg").innerText = "Error connecting to server."; });
}

function renderComplaints() {
  const area = $("complaintArea");
  if (!area) return;
  const user = sessionStorage.getItem("sp_user") || 'guest';
  area.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  fetch(`/api/complaints?username=${encodeURIComponent(user)}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success || !data.complaints.length) {
        area.innerHTML = "<p>No complaints yet.</p>";
        return;
      }
      let html = `<h3>All Complaints</h3><div style="overflow-x:auto;"><table style="width:100%;">
        <tr><th>ID</th><th>Type</th><th>Status</th><th>Date</th><th>Admin Response</th></tr>`;
      data.complaints.forEach(c => {
        const dateStr = new Date(c.createdAt).toLocaleDateString('en-IN');
        const statusColor = c.status === 'Resolved' ? '#10b981' : (c.status === 'In Progress' ? '#f59e0b' : '#3b82f6');
        html += `<tr>
          <td><code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;font-size:12px;">${c.complaintId}</code></td>
          <td>${c.type}</td>
          <td><span style="background:${statusColor}20;color:${statusColor};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${c.status}</span></td>
          <td>${dateStr}</td>
          <td>${c.adminResponse ? `<pre style="white-space:pre-wrap;margin:0;font-size:13px;">${c.adminResponse}</pre>` : '-'}</td>
        </tr>`;
      });
      html += `</table></div>`;
      area.innerHTML = html;
    })
    .catch(err => { area.innerHTML = "<p>Error loading complaints.</p>"; });
}

/* ---------- schemes data with official links ---------- */
// SETU API integration (can be enabled later)
async function fetchSchemesFromSETU() {
  // Placeholder for SETU API integration
  // SETU API endpoint: https://setu.samagra.io/api/v1/schemes
  // This can be implemented when API credentials are available
  try {
    // const response = await fetch('https://setu.samagra.io/api/v1/schemes');
    // const data = await response.json();
    // return data.schemes || [];
    return [];
  } catch (error) {
    console.warn('SETU API not available, using static schemes');
    return [];
  }
}

function getSchemeList() {
  // Extended list of 35+ government schemes with official links
  return [
    {
      title: 'PM Kisan',
      description: 'Direct income support of ₹6,000 per year to farmers',
      icon: 'fas fa-tractor',
      link: 'https://pmkisan.gov.in/'
    },
    {
      title: 'Ayushman Bharat',
      description: 'Health insurance coverage up to ₹5 lakh per family',
      icon: 'fas fa-heartbeat',
      link: 'https://pmjay.gov.in/'
    },
    {
      title: 'PM Awas Yojana',
      description: 'Housing assistance for rural and urban families',
      icon: 'fas fa-home',
      link: 'https://pmaymis.gov.in/'
    },

    {
      title: 'PM Ujjwala Yojana',
      description: 'Free LPG connections for BPL families',
      icon: 'fas fa-fire',
      link: 'https://www.pmuy.gov.in/'
    },
    {
      title: 'Pradhan Mantri Mudra',
      description: 'Micro finance loans for small businesses',
      icon: 'fas fa-rupee-sign',
      link: 'https://www.mudra.org.in/'
    },
    {
      title: 'Sukanya Samriddhi Yojana',
      description: 'Savings scheme for girl child education',
      icon: 'fas fa-female',
      link: 'https://www.indiapost.gov.in/Financial/Pages/Content/Sukanya-Samriddhi-Account.aspx'
    },
    {
      title: 'PM Kisan Maan Dhan',
      description: 'Pension scheme for small and marginal farmers',
      icon: 'fas fa-hand-holding-usd',
      link: 'https://maandhan.in/pm-kisan-maandhan'
    },
    {
      title: 'National Rural Livelihood Mission',
      description: 'Livelihood promotion and skill development',
      icon: 'fas fa-users-cog',
      link: 'https://aajeevika.gov.in/'
    },
    {
      title: 'PM Jan Dhan Yojana',
      description: 'Financial inclusion - zero balance bank accounts',
      icon: 'fas fa-university',
      link: 'https://www.pmjdy.gov.in/'
    },
    {
      title: 'PM Suraksha Bima Yojana',
      description: 'Accident insurance coverage up to ₹2 lakh',
      icon: 'fas fa-shield-alt',
      link: 'https://www.jansuraksha.gov.in/'
    },
    {
      title: 'PM Jeevan Jyoti Bima',
      description: 'Life insurance coverage up to ₹2 lakh',
      icon: 'fas fa-heart',
      link: 'https://www.jansuraksha.gov.in/'
    },
    {
      title: 'Atal Pension Yojana',
      description: 'Pension scheme for unorganized sector workers',
      icon: 'fas fa-piggy-bank',
      link: 'https://www.npscra.nsdl.co.in/atal-pension-yojana/'
    },
    {
      title: 'Stand Up India',
      description: 'Bank loans for SC/ST and women entrepreneurs',
      icon: 'fas fa-handshake',
      link: 'https://www.standupmitra.in/'
    },
    {
      title: 'PM Fasal Bima Yojana',
      description: 'Crop insurance scheme for farmers',
      icon: 'fas fa-seedling',
      link: 'https://pmfby.gov.in/'
    },
    {
      title: 'Kisan Credit Card',
      description: 'Credit facility for farmers',
      icon: 'fas fa-credit-card',
      link: 'https://www.nabard.org/content1.aspx?id=475&catid=8&mid=464'
    },
    {
      title: 'PM Matru Vandana Yojana',
      description: 'Maternity benefit program for pregnant and lactating mothers',
      icon: 'fas fa-baby',
      link: 'https://wcd.nic.in/schemes/pradhan-mantri-matru-vandana-yojana'
    },
    {
      title: 'Pradhan Mantri Shram Yogi Maan-Dhan',
      description: 'Pension scheme for unorganized workers',
      icon: 'fas fa-hard-hat',
      link: 'https://maandhan.in/shram-yogi-maandhan'
    },
    {
      title: 'PM Street Vendor AtmaNirbhar Nidhi',
      description: 'Special micro-credit facility for street vendors',
      icon: 'fas fa-store',
      link: 'https://pmsvanidhi.mohua.gov.in/'
    },
    {
      title: 'One Nation One Ration Card',
      description: 'Portable ration card for food security',
      icon: 'fas fa-id-card',
      link: 'https://www.nfsa.gov.in/portal/ration_card_portability_home'
    },
    {
      title: 'PM Garib Kalyan Anna Yojana',
      description: 'Free food grains distribution scheme',
      icon: 'fas fa-wheat-awn',
      link: 'https://www.nfsa.gov.in/'
    },
    {
      title: 'Pradhan Mantri Gramin Awaas Yojana',
      description: 'Housing for all in rural areas',
      icon: 'fas fa-home',
      link: 'https://pmayg.nic.in/'
    },
    {
      title: 'Deen Dayal Upadhyaya Grameen Kaushalya Yojana',
      description: 'Skill development for rural youth',
      icon: 'fas fa-user-graduate',
      link: 'https://ddugky.gov.in/'
    },
    {
      title: 'Pradhan Mantri Gram Sadak Yojana',
      description: 'Rural road connectivity program',
      icon: 'fas fa-road',
      link: 'https://pmgsy.nic.in/'
    },
    {
      title: 'Swachh Bharat Mission',
      description: 'Clean India mission for sanitation',
      icon: 'fas fa-recycle',
      link: 'https://swachhbharatmission.gov.in/'
    },
    {
      title: 'Jal Jeevan Mission',
      description: 'Tap water supply to all rural households',
      icon: 'fas fa-tint',
      link: 'https://jaljeevanmission.gov.in/'
    },
    {
      title: 'PM Poshan',
      description: 'Nutrition program for children and mothers',
      icon: 'fas fa-apple-alt',
      link: 'https://pmposhan.education.gov.in/'
    },
    {
      title: 'National Scholarship Portal',
      description: 'Scholarships for students',
      icon: 'fas fa-graduation-cap',
      link: 'https://scholarships.gov.in/'
    },
    {
      title: 'Digital India',
      description: 'Digital infrastructure and services',
      icon: 'fas fa-wifi',
      link: 'https://www.digitalindia.gov.in/'
    },
    {
      title: 'PM Poshan',
      description: 'Nutrition program for children and mothers',
      icon: 'fas fa-apple-alt',
      link: 'https://pmposhan.education.gov.in/'
    },
    {
      title: 'PM Vishwakarma',
      description: 'Support scheme for traditional artisans and craftspeople',
      icon: 'fas fa-hammer',
      link: 'https://pmvishwakarma.gov.in/'
    },
    {
      title: 'PM PRANAM',
      description: 'Promotion of Alternative Nutrients for Agriculture Management',
      icon: 'fas fa-leaf',
      link: 'https://www.agriculture.gov.in/'
    },
    {
      title: 'PM Gati Shakti',
      description: 'Infrastructure development for rural connectivity',
      icon: 'fas fa-network-wired',
      link: 'https://www.pmgatishakti.gov.in/'
    },
    {
      title: 'Rashtriya Krishi Vikas Yojana',
      description: 'Comprehensive development of agriculture and allied sectors',
      icon: 'fas fa-seedling',
      link: 'https://rkvy.nic.in/'
    },
    {
      title: 'Pradhan Mantri Krishi Sinchai Yojana',
      description: 'Irrigation scheme for farmers',
      icon: 'fas fa-water',
      link: 'https://pmksy.gov.in/'
    },
    {
      title: 'National Mission for Sustainable Agriculture',
      description: 'Sustainable agriculture practices and climate resilience',
      icon: 'fas fa-globe',
      link: 'https://nmsa.dac.gov.in/'
    },
    {
      title: 'Pradhan Mantri Kisan Urja Suraksha',
      description: 'Solar power scheme for farmers',
      icon: 'fas fa-solar-panel',
      link: 'https://pradhanmantri-kisan-urja-suraksha-abhiyan.in/'
    },
    {
      title: 'Rural Self Employment Training Institutes',
      description: 'Skill training for rural youth',
      icon: 'fas fa-chalkboard-teacher',
      link: 'https://rseti.gov.in/'
    },
    {
      title: 'Pradhan Mantri Adarsh Gram Yojana',
      description: 'Integrated development of villages',
      icon: 'fas fa-village',
      link: 'https://rural.nic.in/'
    },
    {
      title: 'National Rural Health Mission',
      description: 'Healthcare services in rural areas',
      icon: 'fas fa-hospital',
      link: 'https://nhm.gov.in/'
    },
    {
      title: 'Pradhan Mantri Gramin Digital Saksharta Abhiyan',
      description: 'Digital literacy program for rural areas',
      icon: 'fas fa-mobile-alt',
      link: 'https://www.pmgdisha.in/'
    },
    {
      title: 'Pradhan Mantri Kaushal Vikas Yojana',
      description: 'Skill development and training program',
      icon: 'fas fa-tools',
      link: 'https://www.pmkvyofficial.org/'
    },
    {
      title: 'PM Awas Yojana - Urban',
      description: 'Housing for all in urban areas',
      icon: 'fas fa-building',
      link: 'https://pmaymis.gov.in/'
    },
    {
      title: 'Pradhan Mantri Shram Yogi Maan-Dhan',
      description: 'Pension for unorganized workers',
      icon: 'fas fa-hard-hat',
      link: 'https://maandhan.in/shram-yogi-maandhan'
    },
    {
      title: 'PM Awas Yojana - Urban',
      description: 'Housing for all in urban areas',
      icon: 'fas fa-building',
      link: 'https://pmaymis.gov.in/'
    },
    {
      title: 'Pradhan Mantri Shram Yogi Maan-Dhan',
      description: 'Pension for unorganized workers',
      icon: 'fas fa-hard-hat',
      link: 'https://maandhan.in/shram-yogi-maandhan'
    },
    {
      title: 'PM Kisan Samman Nidhi',
      description: 'Direct benefit transfer to farmers',
      icon: 'fas fa-tractor',
      link: 'https://pmkisan.gov.in/'
    },
    {
      title: 'PM Vishwakarma',
      description: 'Support scheme for traditional artisans and craftspeople',
      icon: 'fas fa-hammer',
      link: 'https://pmvishwakarma.gov.in/'
    },
    {
      title: 'PM PRANAM',
      description: 'Promotion of Alternative Nutrients for Agriculture Management',
      icon: 'fas fa-leaf',
      link: 'https://www.agriculture.gov.in/'
    },
    {
      title: 'Rashtriya Krishi Vikas Yojana',
      description: 'Comprehensive development of agriculture and allied sectors',
      icon: 'fas fa-seedling',
      link: 'https://rkvy.nic.in/'
    },
    {
      title: 'Pradhan Mantri Krishi Sinchai Yojana',
      description: 'Irrigation scheme for farmers - Har Khet Ko Pani',
      icon: 'fas fa-water',
      link: 'https://pmksy.gov.in/'
    },
    {
      title: 'National Mission for Sustainable Agriculture',
      description: 'Sustainable agriculture practices and climate resilience',
      icon: 'fas fa-globe',
      link: 'https://nmsa.dac.gov.in/'
    },
    {
      title: 'Pradhan Mantri Kisan Urja Suraksha',
      description: 'Solar power scheme for farmers - KUSUM',
      icon: 'fas fa-solar-panel',
      link: 'https://mnre.gov.in/'
    },
    {
      title: 'Rural Self Employment Training Institutes',
      description: 'Skill training for rural youth - RSETI',
      icon: 'fas fa-chalkboard-teacher',
      link: 'https://rseti.gov.in/'
    },
    {
      title: 'Pradhan Mantri Adarsh Gram Yojana',
      description: 'Integrated development of villages',
      icon: 'fas fa-village',
      link: 'https://rural.nic.in/'
    },
    {
      title: 'National Rural Health Mission',
      description: 'Healthcare services in rural areas',
      icon: 'fas fa-hospital',
      link: 'https://nhm.gov.in/'
    },
    {
      title: 'Pradhan Mantri Gramin Digital Saksharta Abhiyan',
      description: 'Digital literacy program for rural areas - PMGDISHA',
      icon: 'fas fa-mobile-alt',
      link: 'https://www.pmgdisha.in/'
    },
    {
      title: 'PM Gati Shakti',
      description: 'Infrastructure development for rural connectivity',
      icon: 'fas fa-network-wired',
      link: 'https://www.pmgatishakti.gov.in/'
    },
    {
      title: 'Pradhan Mantri Kaushal Vikas Yojana',
      description: 'Skill development and training program - PMKVY',
      icon: 'fas fa-tools',
      link: 'https://www.pmkvyofficial.org/'
    }
  ];
}

/* ---------- schemes modal - simplified (link only, no form) ---------- */
function openScheme(title, desc, officialLink = '') {
  $("schemeTitle").innerText = title;
  $("schemeDesc").innerText = desc;

  // Track the view
  const user = sessionStorage.getItem("sp_user");
  if (user) {
    fetch('/api/user/activity/scheme-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, schemeName: title })
    }).catch(err => console.error("Error tracking scheme view:", err));
  }

  const formArea = $("schemeFormArea");
  let html = `<div class="scheme-info">`;

  // Add scheme eligibility info
  html += `<div style="background:#f0f9ff;border-left:4px solid var(--accent);padding:16px;margin-bottom:16px;border-radius:4px;text-align:left;">
    <strong><i class="fas fa-info-circle"></i> Eligibility Criteria:</strong>
    <p style="margin:8px 0 0 0;font-size:14px;color:#111827;line-height:1.6;">${getSchemeEligibility(title)}</p>
  </div>`;

  // Add benefits
  const benefits = getSchemeBenefits(title);
  if (benefits) {
    html += `<div style="background:#e8f5e9;border-left:4px solid #4caf50;padding:16px;margin-bottom:16px;border-radius:4px;text-align:left;">
      <strong><i class="fas fa-gift"></i> Benefits:</strong>
      <p style="margin:8px 0 0 0;font-size:14px;color:#111827;line-height:1.6;">${benefits}</p>
    </div>`;
  }

  // Add application fee info
  const fee = getSchemeFee(title);
  if (fee) {
    html += `<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:16px;margin-bottom:16px;border-radius:4px;text-align:left;">
      <strong><i class="fas fa-rupee-sign"></i> Application Fee:</strong>
      <p style="margin:8px 0 0 0;font-size:14px;color:#111827;line-height:1.6;">${fee}</p>
    </div>`;
  }

  // Official government link - prominent display
  if (officialLink && officialLink.trim() !== '') {
    // Store link for button click handler
    currentSchemeLink = officialLink;
    // Escape the link for use in HTML
    const escapedLink = officialLink.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    html += `<div style="margin-top:20px;padding:20px;background:linear-gradient(135deg, #e8f5e9, #c8e6c9);border:2px solid #4caf50;border-radius:8px;text-align:center;">
      <i class="fas fa-external-link-alt" style="font-size:32px;color:#4caf50;margin-bottom:12px;"></i>
      <h4 style="margin:0 0 12px 0;color:#2e7d32;">Apply on Official Government Website</h4>
      <p style="margin:0 0 16px 0;font-size:14px;color:#555;">Click below to apply directly on the official government portal</p>
      <a href="${officialLink}" target="_blank" rel="noopener noreferrer" 
         id="schemeOfficialLinkBtn"
         style="display:inline-block;padding:12px 24px;background:#4caf50;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;cursor:pointer;transition:all 0.3s;box-shadow:0 4px 6px rgba(0,0,0,0.1);"
         onmouseover="this.style.background='#45a049';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 12px rgba(0,0,0,0.15)';"
         onmouseout="this.style.background='#4caf50';this.style.transform='translateY(0)';this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';">
        <i class="fas fa-external-link-alt"></i> Apply Now on Official Website
      </a>
      <p style="margin:12px 0 0 0;font-size:12px;color:#666;">
        <i class="fas fa-shield-alt"></i> Secure & Official Government Portal
      </p>
      <p style="margin:8px 0 0 0;font-size:11px;color:#999;word-break:break-all;">
        <a href="${officialLink}" target="_blank" style="color:#999;text-decoration:underline;">${officialLink}</a>
      </p>
      
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #c8e6c9;">
        <p style="margin:0 0 12px 0;font-size:14px;color:#2e7d32;font-weight:500;">Already applied for this scheme?</p>
        <button id="markAppliedBtn" onclick="markSchemeApplied('${title.replace(/'/g, "\\'")}')" class="btn primary" style="background:#10b981;border:none;">
          <i class="fas fa-check-double"></i> I Have Applied
        </button>
      </div>
    </div>`;
  } else {
    html += `<div style="margin-top:20px;padding:16px;background:#fff3cd;border-left:4px solid #ffc107;border-radius:4px;text-align:left;">
      <p style="margin:0;font-size:14px;color:#856404;">
        <i class="fas fa-info-circle"></i> <strong>Note:</strong> Official link not available. Please contact your local government office for application details.
      </p>
    </div>`;
  }

  html += `</div>`;
  formArea.innerHTML = html;

  // Hide apply button, show only close
  const applyBtn = $("schemeApplyBtn");
  if (applyBtn) applyBtn.style.display = 'none';
  const officialBtn = $("schemeOfficialBtn");
  if (officialBtn) officialBtn.style.display = 'none';

  // Ensure link button works - add event listener as backup
  setTimeout(() => {
    const linkBtn = document.getElementById('schemeOfficialLinkBtn');
    if (linkBtn && officialLink) {
      // Remove any existing listeners and add new one
      const newLinkBtn = linkBtn.cloneNode(true);
      linkBtn.parentNode.replaceChild(newLinkBtn, linkBtn);
      newLinkBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.open(officialLink, '_blank', 'noopener,noreferrer');
        return false;
      });
      // Also ensure href works
      newLinkBtn.href = officialLink;
      newLinkBtn.target = '_blank';
      newLinkBtn.rel = 'noopener noreferrer';
    }
  }, 100);

  $("modalLayer").classList.remove("hidden");
}

function markSchemeApplied(schemeName) {
  const user = sessionStorage.getItem("sp_user");
  if (!user) {
    alert("Please log in to mark a scheme as applied.");
    return;
  }

  const btn = document.getElementById('markAppliedBtn');
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;
  }

  fetch('/api/schemes/apply-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, schemeName })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (btn) {
          btn.innerHTML = '<i class="fas fa-check-circle"></i> Marked as Applied';
          btn.style.background = '#059669'; // darker green
        }
        alert(`You have successfully marked "${schemeName}" as applied!`);
      } else {
        if (btn) {
          btn.innerHTML = '<i class="fas fa-check-double"></i> I Have Applied';
          btn.disabled = false;
        }
        alert(data.message || "Failed to mark as applied.");
      }
    })
    .catch(err => {
      console.error("Error marking scheme applied:", err);
      if (btn) {
        btn.innerHTML = '<i class="fas fa-check-double"></i> I Have Applied';
        btn.disabled = false;
      }
      alert("An error occurred. Please try again.");
    });
}

function getSchemeFormFields(schemeName) {
  const commonFields = [
    { id: 'fullName', label: 'Full Name (as per Aadhaar)', placeholder: 'Enter your full name', required: true, pattern: '^[A-Za-z\\s]{3,}$' },
    { id: 'fatherName', label: "Father's/Husband's Name", placeholder: 'Father or Husband name', required: true },
    { id: 'aadhaar', label: 'Aadhaar Number', placeholder: '12-digit Aadhaar number', required: true, type: 'text', pattern: '^[0-9]{12}$', maxlength: '12' },
    { id: 'phone', label: 'Mobile Number', type: 'tel', placeholder: '10-digit mobile number', required: true, pattern: '^[6-9][0-9]{9}$', maxlength: '10' },
    { id: 'email', label: 'Email Address', type: 'email', placeholder: 'your.email@example.com', required: false },
    { id: 'address', label: 'Residential Address', placeholder: 'Complete residential address', required: true },
    { id: 'district', label: 'District', placeholder: 'District name', required: true },
    { id: 'state', label: 'State', placeholder: 'State name', required: true },
    { id: 'pincode', label: 'Pincode', type: 'text', placeholder: '6-digit pincode', required: true, pattern: '^[0-9]{6}$', maxlength: '6' },
    { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true }
  ];

  const schemeSpecific = {
    'PM Kisan': [
      { id: 'category', label: 'Farmer Category', type: 'select', options: ['Small Farmer', 'Marginal Farmer', 'Landless Farmer'], required: true },
      { id: 'bankAccount', label: 'Bank Account Number', placeholder: 'Bank account number', required: true, pattern: '^[0-9]{9,18}$' },
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'Bank IFSC code (e.g., SBIN0000123)', required: true, pattern: '^[A-Z]{4}0[A-Z0-9]{6}$', maxlength: '11' },
      { id: 'bankName', label: 'Bank Name', placeholder: 'Name of bank', required: true },
      { id: 'branchName', label: 'Branch Name', placeholder: 'Bank branch name', required: true },
      { id: 'landSize', label: 'Total Land Size (in acres)', type: 'number', placeholder: 'Total land owned', required: true, min: '0.01', step: '0.01' },
      { id: 'landRecords', label: 'Land Record Type', type: 'select', options: ['Khata', 'Khatiyan', 'Record of Rights'], required: true },
      { id: 'caste', label: 'Caste Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Others'], required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar copy, Bank passbook, Land documents, Photo' }
    ],
    'Ayushman Bharat': [
      { id: 'familyHead', label: 'Family Head Name', placeholder: 'Head of family name', required: true },
      { id: 'familyMembers', label: 'Number of Family Members', type: 'number', placeholder: 'Total family members', required: true, min: '1', max: '20' },
      { id: 'annualIncome', label: 'Annual Household Income (₹)', type: 'number', placeholder: 'Annual household income', required: true, min: '0' },
      { id: 'caste', label: 'Caste Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Others'], required: true },
      { id: 'rationCard', label: 'Ration Card Number', placeholder: 'Ration card number (if applicable)', required: false },
      { id: 'existingInsurance', label: 'Existing Health Insurance', type: 'select', options: ['Yes', 'No'], required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar of all members, Income certificate, Caste certificate, Family photo' }
    ],
    'PM Awas Yojana': [
      { id: 'category', label: 'Scheme Category', type: 'select', options: ['BPL (Below Poverty Line)', 'APL (Above Poverty Line)', 'EWS (Economically Weaker Section)'], required: true },
      { id: 'annualIncome', label: 'Annual Household Income (₹)', type: 'number', placeholder: 'Annual household income', required: true, min: '0' },
      { id: 'currentHousing', label: 'Current Housing Status', type: 'select', options: ['Own House', 'Rented House', 'Homeless', 'Living with Family'], required: true },
      { id: 'houseSize', label: 'Required House Size (in sq. ft.)', type: 'number', placeholder: 'Desired house size', required: false },
      { id: 'familyMembers', label: 'Number of Family Members', type: 'number', placeholder: 'Number of family members', required: true, min: '1', max: '20' },
      { id: 'caste', label: 'Caste Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Others'], required: true },
      { id: 'landOwnership', label: 'Do you own land for construction?', type: 'select', options: ['Yes', 'No'], required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Income certificate, Caste certificate, Aadhaar, Bank details, Land documents (if applicable)' }
    ],
    'MGNREGA': [
      { id: 'jobCard', label: 'MGNREGA Job Card Number', placeholder: 'Job card number', required: true },
      { id: 'jobCardIssueDate', label: 'Job Card Issue Date', type: 'date', required: true },
      { id: 'workDays', label: 'Desired Work Days per Month', type: 'number', placeholder: 'Days per month', required: true, min: '1', max: '30' },
      { id: 'workPreference', label: 'Work Preference', type: 'select', options: ['Road Construction', 'Water Conservation', 'Irrigation', 'Forestry', 'Any Available'], required: true },
      { id: 'bankAccount', label: 'Bank Account Number', placeholder: 'Account number for wage payment', required: true },
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'Bank IFSC code', required: true, pattern: '^[A-Z]{4}0[A-Z0-9]{6}$' },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar, Job card, Bank passbook, Photo' }
    ],
    'PM Ujjwala Yojana': [
      { id: 'category', label: 'Applicant Category', type: 'select', options: ['BPL Household', 'SC/ST Household', 'Forest Dweller', 'Most Backward Classes', 'Island Dweller'], required: true },
      { id: 'annualIncome', label: 'Annual Household Income (₹)', type: 'number', placeholder: 'Annual household income', required: true, min: '0' },
      { id: 'familyMembers', label: 'Number of Family Members', type: 'number', placeholder: 'Number of family members', required: true, min: '1' },
      { id: 'existingLPG', label: 'Do you have existing LPG connection?', type: 'select', options: ['No', 'Yes (wants second connection)'], required: true },
      { id: 'bankAccount', label: 'Bank Account Number', placeholder: 'Account for subsidy transfer', required: true },
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'Bank IFSC code', required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar, BPL card or income certificate, Bank details, Family photo' }
    ],
    'Pradhan Mantri Mudra': [
      { id: 'businessType', label: 'Type of Business/Activity', placeholder: 'Type of business/activity', required: true },
      { id: 'businessCategory', label: 'Business Category', type: 'select', options: ['Shishu (up to ₹50,000)', 'Kishore (₹50,001 to ₹5 lakh)', 'Tarun (₹5,00,001 to ₹10 lakh)'], required: true },
      { id: 'loanAmount', label: 'Required Loan Amount (₹)', type: 'number', placeholder: 'Loan amount needed', required: true, min: '1000' },
      { id: 'businessAddress', label: 'Business Address', placeholder: 'Business location', required: true },
      { id: 'businessAge', label: 'Business Age (in months)', type: 'number', placeholder: 'How long business exists', required: true, min: '0' },
      { id: 'existingLoan', label: 'Do you have existing loans?', type: 'select', options: ['No', 'Yes'], required: true },
      { id: 'bankAccount', label: 'Business Bank Account Number', placeholder: 'Business account number', required: true },
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'Bank IFSC code', required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar, Business registration, Bank statements, Income proof, Business plan' }
    ],
    'Sukanya Samriddhi': [
      { id: 'girlName', label: "Girl Child's Full Name", placeholder: 'Name of the girl child', required: true },
      { id: 'girlDOB', label: "Girl's Date of Birth", type: 'date', required: true },
      { id: 'girlAadhaar', label: "Girl's Aadhaar Number (if available)", placeholder: '12-digit Aadhaar', required: false, pattern: '^[0-9]{12}$' },
      { id: 'guardianName', label: 'Guardian/Parent Name', placeholder: 'Parent/Guardian name', required: true },
      { id: 'guardianRelation', label: 'Relation with Girl', type: 'select', options: ['Father', 'Mother', 'Guardian'], required: true },
      { id: 'initialDeposit', label: 'Initial Deposit Amount (₹)', type: 'number', placeholder: 'Minimum ₹250, Maximum ₹1.5 lakh/year', required: true, min: '250', max: '150000' },
      { id: 'bankAccount', label: 'Bank Account Number', placeholder: 'Account for deposits', required: true },
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'Bank IFSC code', required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Birth certificate, Aadhaar of girl and guardian, Photo, Bank details' }
    ],
    'PM Kisan Maan Dhan': [
      { id: 'age', label: 'Age', type: 'number', placeholder: 'Your age (18-40 years)', required: true, min: '18', max: '40' },
      { id: 'landSize', label: 'Land Size Owned (in acres)', type: 'number', placeholder: 'Total land owned (max 2 hectares)', required: true, min: '0.01', step: '0.01', max: '5' },
      { id: 'cultivatingStatus', label: 'Are you actively cultivating?', type: 'select', options: ['Yes', 'No'], required: true },
      { id: 'bankAccount', label: 'Bank Account Number', placeholder: 'Account for pension payments', required: true },
      { id: 'ifsc', label: 'IFSC Code', placeholder: 'Bank IFSC code', required: true },
      { id: 'nomineeName', label: 'Nominee Name', placeholder: 'Nominee for pension', required: true },
      { id: 'nomineeRelation', label: 'Nominee Relation', placeholder: 'Relationship with nominee', required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar, Land documents, Bank passbook, Age proof, Photo' }
    ],
    'National Rural Livelihood': [
      { id: 'interestArea', label: 'Area of Interest/Skill', placeholder: 'Skill/training interest', required: true },
      { id: 'trainingType', label: 'Type of Training Preferred', type: 'select', options: ['Agriculture', 'Handicrafts', 'Textiles', 'Food Processing', 'IT Skills', 'Service Sector', 'Others'], required: true },
      { id: 'experience', label: 'Previous Work Experience (in months)', type: 'number', placeholder: 'Work experience if any', required: false, min: '0' },
      { id: 'annualIncome', label: 'Annual Household Income (₹)', type: 'number', placeholder: 'Current income', required: true, min: '0' },
      { id: 'caste', label: 'Caste Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Others'], required: true },
      { id: 'employmentStatus', label: 'Current Employment Status', type: 'select', options: ['Unemployed', 'Self-Employed', 'Seasonal Worker', 'Part-time', 'Others'], required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar, Educational certificates, Income certificate, Caste certificate, Photo' }
    ],
    'Digital Village': [
      { id: 'internetAccess', label: 'Do you have internet access?', type: 'select', options: ['Yes', 'No'], required: true },
      { id: 'deviceType', label: 'Device Owned', type: 'select', options: ['Smartphone', 'Computer', 'Tablet', 'None'], required: true },
      { id: 'digitalLiteracy', label: 'Digital Literacy Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar, Address proof, Device ownership proof (if applicable)' }
    ],
    'Clean Panchayat': [
      { id: 'participationType', label: 'Participation Type', type: 'select', options: ['Individual', 'Community Group', 'NGO'], required: true },
      { id: 'areaOfInterest', label: 'Area of Interest', type: 'select', options: ['Waste Management', 'Sanitation', 'Water Conservation', 'Tree Plantation', 'Cleanliness Drive'], required: true },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar, Group registration (if applicable), Proposal document' }
    ],
    'Education Aid': [
      { id: 'educationLevel', label: 'Education Level', type: 'select', options: ['Primary', 'Secondary', 'Higher Secondary', 'Graduate', 'Post Graduate'], required: true },
      { id: 'annualIncome', label: 'Annual Household Income (₹)', type: 'number', placeholder: 'Annual household income', required: true, min: '0' },
      { id: 'caste', label: 'Caste Category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'Others'], required: true },
      { id: 'studentName', label: "Student's Name", placeholder: 'Name of student', required: true },
      { id: 'studentAge', label: "Student's Age", type: 'number', placeholder: 'Age of student', required: true, min: '5' },
      { id: 'documents', label: 'Required Documents', type: 'file', accept: '.pdf,.jpg,.jpeg,.png', multiple: true, required: true, note: 'Upload: Aadhaar, Educational certificates, Income certificate, Caste certificate, Bank details' }
    ]
  };

  const specificFields = schemeSpecific[schemeName] || [];
  return [...commonFields, ...specificFields];
}

function getSchemeEligibility(schemeName) {
  const eligibility = {
    'PM Kisan': 'All landholding farmers are eligible. Land should be in farmer\'s name. Annual income support of ₹6,000 paid in 3 installments.',
    'Ayushman Bharat': 'Families listed in SECC database, or families with annual income below ₹5 lakh. Coverage up to ₹5 lakh per family per year.',
    'PM Awas Yojana': 'Economically weaker sections, low-income groups, and middle-income groups. Must not own a pucca house.',
    'MGNREGA': 'All adult members of rural households willing to do unskilled manual work. Job card mandatory.',
    'PM Ujjwala Yojana': 'Adult women from BPL households, SC/ST households, Most Backward Classes, forest dwellers, or island dwellers.',
    'Pradhan Mantri Mudra': 'All non-corporate, non-farm small/micro enterprises. Loan categories: Shishu (up to ₹50k), Kishore (₹50k-5L), Tarun (₹5L-10L).',
    'Sukanya Samriddhi': 'Girl child below 10 years of age. Can be opened by natural or legal guardian. Maximum deposit ₹1.5 lakh per year.',
    'PM Kisan Maan Dhan': 'Small and marginal farmers aged 18-40 years. Landholding up to 2 hectares. Monthly pension of ₹3000 after 60 years.',
    'National Rural Livelihood': 'Rural poor, especially women from BPL families, SC/ST households. Focus on skill development and livelihood generation.',
    'PM Jan Dhan Yojana': 'All Indian citizens above 10 years of age. No minimum balance required. Overdraft facility up to ₹10,000.',
    'PM Suraksha Bima Yojana': 'All savings bank account holders aged 18-70 years. Premium of ₹12 per annum. Coverage up to ₹2 lakh.',
    'PM Jeevan Jyoti Bima': 'All savings bank account holders aged 18-50 years. Premium of ₹436 per annum. Coverage up to ₹2 lakh.',
    'Atal Pension Yojana': 'Unorganized sector workers aged 18-40 years. Guaranteed pension of ₹1,000-5,000 per month after 60 years.',
    'Stand Up India': 'SC/ST and women entrepreneurs. Bank loans from ₹10 lakh to ₹1 crore for greenfield enterprises.',
    'PM Fasal Bima Yojana': 'All farmers growing notified crops. Premium: 2% for Kharif, 1.5% for Rabi, 5% for commercial/horticultural crops.',
    'Kisan Credit Card': 'All farmers including tenant farmers, oral lessees, and sharecroppers. Credit limit based on landholding and cropping pattern.',
    'PM Matru Vandana Yojana': 'Pregnant and lactating mothers above 19 years of age. First living child eligible. Cash benefit of ₹5,000 in installments.',
    'Pradhan Mantri Shram Yogi Maan-Dhan': 'Unorganized workers aged 18-40 years with monthly income up to ₹15,000. Monthly pension ₹3,000 after 60 years.',
    'PM Street Vendor AtmaNirbhar Nidhi': 'Street vendors, hawkers, and thelewala vendors. Working capital loan up to ₹10,000.',
    'One Nation One Ration Card': 'All ration card holders. Enables portability of food security benefits across India.',
    'PM Garib Kalyan Anna Yojana': 'All beneficiaries under National Food Security Act. Free 5 kg food grains per person per month.',
    'Pradhan Mantri Gramin Awaas Yojana': 'Rural families without pucca house. Priority to SC/ST, minorities, and women-headed households.',
    'Deen Dayal Upadhyaya Grameen Kaushalya Yojana': 'Rural youth aged 15-35 years. Skill training with placement assistance.',
    'Pradhan Mantri Gram Sadak Yojana': 'Rural habitations with population 500+ (plains) or 250+ (hilly areas). Road connectivity program.',
    'Swachh Bharat Mission': 'All citizens. Focus on open defecation free India, solid and liquid waste management.',
    'Jal Jeevan Mission': 'All rural households. Tap water connection to every household by 2024.',
    'PM Poshan': 'Children 6 months to 6 years, pregnant and lactating mothers. Nutrition support and supplementary nutrition.',
    'PM eVIDYA': 'All students and teachers. Digital education through TV, radio, and online platforms.',
    'Pradhan Mantri Kaushal Vikas Yojana': 'Indian youth aged 15-45 years. Skill training with industry-relevant courses and certification.',
    'PM Awas Yojana - Urban': 'Economically weaker sections, low and middle-income groups in urban areas. Must not own pucca house.',
    'PM Kisan Samman Nidhi': 'All landholding farmers. Annual financial benefit of ₹6,000 in three equal installments.'
  };
  return eligibility[schemeName] || 'Please check official scheme guidelines for eligibility criteria.';
}

function validateAndApplyScheme(title) {
  const formArea = $("schemeFormArea");
  const inputs = formArea.querySelectorAll('input, select');
  const fields = {};
  let isValid = true;
  let errorMessages = [];

  inputs.forEach(input => {
    const isSelect = input.tagName === 'SELECT';
    const isFile = input.type === 'file';
    const value = isFile ? input.files : (isSelect ? input.value : input.value.trim());
    const label = input.previousElementSibling ? input.previousElementSibling.textContent.replace(' *', '') : 'Field';

    // Validate required fields
    if (input.hasAttribute('required')) {
      if (isFile) {
        if (!input.files || input.files.length === 0) {
          isValid = false;
          errorMessages.push(`${label} is required`);
          input.style.borderColor = '#ef4444';
          setTimeout(() => input.style.borderColor = '#e6e9ee', 3000);
        } else {
          fields[input.id] = Array.from(input.files).map(f => f.name).join(', ');
        }
      } else if (isSelect) {
        if (!value || value === '') {
          isValid = false;
          errorMessages.push(`${label} is required`);
          input.style.borderColor = '#ef4444';
          setTimeout(() => input.style.borderColor = '#e6e9ee', 3000);
        } else {
          fields[input.id] = value;
        }
      } else if (!value) {
        isValid = false;
        errorMessages.push(`${label} is required`);
        input.style.borderColor = '#ef4444';
        setTimeout(() => input.style.borderColor = '#e6e9ee', 3000);
      } else {
        // Pattern validation for text inputs
        if (input.pattern && !new RegExp(input.pattern).test(value)) {
          isValid = false;
          errorMessages.push(`Invalid ${label} format`);
          input.style.borderColor = '#ef4444';
          setTimeout(() => input.style.borderColor = '#e6e9ee', 3000);
        } else {
          fields[input.id] = value;
        }
      }
    } else if (value && !isFile) {
      if (isSelect && value !== '') {
        fields[input.id] = value;
      } else if (!isSelect && value) {
        fields[input.id] = value;
      }
    } else if (isFile && input.files && input.files.length > 0) {
      fields[input.id] = Array.from(input.files).map(f => f.name).join(', ');
    }
  });

  // Specific validations
  if (fields.scheme_aadhaar && !/^[0-9]{12}$/.test(fields.scheme_aadhaar)) {
    isValid = false;
    errorMessages.push('Aadhaar number must be exactly 12 digits');
  }

  if (fields.scheme_phone && !/^[6-9][0-9]{9}$/.test(fields.scheme_phone)) {
    isValid = false;
    errorMessages.push('Mobile number must be 10 digits starting with 6-9');
  }

  if (fields.scheme_pincode && !/^[0-9]{6}$/.test(fields.scheme_pincode)) {
    isValid = false;
    errorMessages.push('Pincode must be exactly 6 digits');
  }

  if (!isValid) {
    const errorMsg = errorMessages.length > 0
      ? errorMessages.join('\n• ')
      : "Please fill all required fields (marked with *) before submitting.";
    alert("Validation Errors:\n• " + errorMsg);
    return;
  }

  // Show confirmation
  if (confirm(`Are you sure you want to submit your application for ${title} ?\n\nPlease review all information before confirming.`)) {
    applyScheme(title, fields);
  }
}

function applyScheme(title, fields) {
  const user = sessionStorage.getItem("sp_user") || 'guest';

  // Call API to save application
  fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicantName: user, // Or extract from fields if available, e.g. fields.name
      scheme: title,
      details: {
        ...fields,
        submittedDate: new Date().toISOString(),
        user: user // ensure user is in details for filtering
      },
      username: user
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        closeModal();
        const appId = data.applicationId;
        // Show success modal
        showSuccessModal(
          `Application Submitted Successfully!`,
          `Your application for ${title} has been submitted successfully.Our team will review your application and update the status soon.`,
          `Application ID: ${appId} `
        );
      } else {
        alert('Failed to submit application: ' + (data.message || 'Unknown error'));
      }
    })
    .catch(err => {
      console.error('Submit application error:', err);
      alert('Server error. Please try again later.');
    });
}

function getSchemeFee(schemeName) {
  const fees = {
    'PM Kisan': 'Free - No application fee',
    'Ayushman Bharat': 'Free - No premium, fully government funded',
    'PM Awas Yojana': 'Free - Subsidy: ₹1.2 lakh (rural), ₹2.67 lakh (urban)',
    'MGNREGA': 'Free - Job card issuance free',
    'PM Ujjwala Yojana': 'Free - LPG connection with ₹1,600 subsidy',
    'Pradhan Mantri Mudra': 'Processing fee: ₹50-500 (varies by bank and loan amount)',
    'Sukanya Samriddhi Yojana': 'Minimum deposit: ₹250, Maximum: ₹1.5 lakh per year',
    'PM Kisan Maan Dhan': 'Monthly contribution: ₹55-200 (based on entry age 18-40 years)',
    'National Rural Livelihood Mission': 'Free - Training and support provided',
    'PM Jan Dhan Yojana': 'Free - Zero balance account, no minimum balance',
    'PM Suraksha Bima Yojana': 'Premium: ₹12 per annum (auto-debit from account)',
    'PM Jeevan Jyoti Bima': 'Premium: ₹436 per annum (auto-debit from account)',
    'Atal Pension Yojana': 'Monthly contribution: ₹42-1,454 (based on pension amount ₹1,000-5,000)',
    'Stand Up India': 'Processing fee: 0.5-1% of loan amount (varies by bank)',
    'PM Fasal Bima Yojana': 'Premium: 2% (Kharif), 1.5% (Rabi), 5% (Commercial/Horticultural) - Government pays remaining',
    'Kisan Credit Card': 'Free - No processing fee, interest subvention available',
    'PM Matru Vandana Yojana': 'Free - Cash benefit of ₹5,000 in installments',
    'Pradhan Mantri Shram Yogi Maan-Dhan': 'Monthly contribution: ₹55-200 (based on entry age)',
    'PM Street Vendor AtmaNirbhar Nidhi': 'Free - Interest subsidy of 7%',
    'One Nation One Ration Card': 'Free - No additional charges',
    'PM Garib Kalyan Anna Yojana': 'Free - 5 kg food grains per person per month',
    'Pradhan Mantri Gramin Awaas Yojana': 'Free - Financial assistance up to ₹1.2 lakh',
    'Deen Dayal Upadhyaya Grameen Kaushalya Yojana': 'Free - Training, certification, and placement assistance',
    'Pradhan Mantri Gram Sadak Yojana': 'Free - Fully government funded',
    'Swachh Bharat Mission': 'Subsidy: ₹12,000 for toilet construction (rural)',
    'Jal Jeevan Mission': 'Free - Tap water connection fully funded by government',
    'PM Poshan': 'Free - Supplementary nutrition provided',
    'PM Vishwakarma': 'Free - Registration and training free, loan processing fee as per bank',
    'PM PRANAM': 'Free - Promotion of organic farming practices',
    'PM Gati Shakti': 'Free - Infrastructure development program',
    'Rashtriya Krishi Vikas Yojana': 'Free - Government funded agricultural development',
    'Pradhan Mantri Krishi Sinchai Yojana': 'Subsidy: 55% (small/marginal farmers), 45% (others)',
    'National Mission for Sustainable Agriculture': 'Free - Government funded sustainable practices',
    'Pradhan Mantri Kisan Urja Suraksha': 'Subsidy: Up to 30% of cost for solar pumps',
    'Rural Self Employment Training Institutes': 'Free - Training provided at no cost',
    'Pradhan Mantri Adarsh Gram Yojana': 'Free - Village development program',
    'National Rural Health Mission': 'Free - Healthcare services',
    'Pradhan Mantri Gramin Digital Saksharta Abhiyan': 'Free - Digital literacy training',
    'Pradhan Mantri Kaushal Vikas Yojana': 'Free - Training, certification, and stipend',
    'PM Awas Yojana - Urban': 'Free - Subsidy: ₹2.67 lakh for EWS/LIG',
    'PM Kisan Samman Nidhi': 'Free - Direct benefit transfer'
  };
  return fees[schemeName] || 'Contact office for details';
}

function getSchemeBenefits(schemeName) {
  const benefits = {
    'PM Kisan': '₹6,000 per year (₹2,000 per installment)',
    'Ayushman Bharat': 'Health insurance up to ₹5 lakh per family',
    'PM Awas Yojana': 'Housing assistance up to ₹1.2 lakh (rural)',
    'MGNREGA': '100 days guaranteed employment, daily wages',
    'PM Ujjwala Yojana': 'Free LPG connection with subsidy',
    'Pradhan Mantri Mudra': 'Micro loans up to ₹10 lakh',
    'Sukanya Samriddhi': '8.2% interest rate, tax benefits',
    'PM Kisan Maan Dhan': '₹3,000 monthly pension after 60 years',
    'National Rural Livelihood': 'Skill training and livelihood support',
    'PM Jan Dhan Yojana': 'Zero balance account, overdraft up to ₹10,000, RuPay debit card',
    'PM Suraksha Bima Yojana': 'Accident insurance up to ₹2 lakh for ₹12/year',
    'PM Jeevan Jyoti Bima': 'Life insurance up to ₹2 lakh for ₹436/year',
    'Atal Pension Yojana': 'Guaranteed pension ₹1,000-5,000/month after 60 years',
    'Stand Up India': 'Bank loans ₹10 lakh to ₹1 crore for SC/ST/women entrepreneurs',
    'PM Fasal Bima Yojana': 'Crop insurance coverage, premium subsidy by government',
    'Kisan Credit Card': 'Flexible credit for agricultural needs, interest subvention',
    'PM Matru Vandana Yojana': 'Cash benefit of ₹5,000 in three installments for first living child',
    'Pradhan Mantri Shram Yogi Maan-Dhan': 'Monthly pension of ₹3,000 after 60 years of age',
    'PM Street Vendor AtmaNirbhar Nidhi': 'Working capital loan up to ₹10,000, interest subsidy',
    'One Nation One Ration Card': 'Portable food security benefits across India',
    'PM Garib Kalyan Anna Yojana': 'Free 5 kg food grains per person per month',
    'Pradhan Mantri Gramin Awaas Yojana': 'Financial assistance up to ₹1.2 lakh for house construction',
    'Deen Dayal Upadhyaya Grameen Kaushalya Yojana': 'Skill training with 70% placement guarantee',
    'Pradhan Mantri Gram Sadak Yojana': 'All-weather road connectivity to rural areas',
    'Swachh Bharat Mission': 'Toilet construction subsidy, waste management infrastructure',
    'Jal Jeevan Mission': 'Functional tap water connection to every rural household',
    'PM Poshan': 'Supplementary nutrition, hot cooked meals, take-home rations',
    'PM eVIDYA': 'Free digital education content, online courses, virtual classrooms',
    'Pradhan Mantri Kaushal Vikas Yojana': 'Skill certification, placement assistance, training stipend',
    'PM Awas Yojana - Urban': 'Financial assistance up to ₹2.67 lakh for house construction/purchase',
    'PM Kisan Samman Nidhi': '₹6,000 per year (₹2,000 per installment) directly to bank account',
    'PM Vishwakarma': 'Toolkit assistance up to ₹15,000, skill training, credit support up to ₹3 lakh',
    'PM PRANAM': 'Promotion of organic farming, reduced chemical fertilizer use, environmental benefits',
    'Rashtriya Krishi Vikas Yojana': 'Agricultural infrastructure, value chain development, market linkages',
    'Pradhan Mantri Krishi Sinchai Yojana': 'Irrigation facilities, water conservation, micro-irrigation systems',
    'National Mission for Sustainable Agriculture': 'Climate-resilient farming, soil health, water use efficiency',
    'Pradhan Mantri Kisan Urja Suraksha': 'Solar pumps, grid-connected solar plants, income from surplus power',
    'Rural Self Employment Training Institutes': 'Skill training, certification, credit linkage, self-employment support',
    'Pradhan Mantri Adarsh Gram Yojana': 'Integrated village development, infrastructure, social welfare',
    'National Rural Health Mission': 'Primary healthcare, health infrastructure, maternal and child health services',
    'Pradhan Mantri Gramin Digital Saksharta Abhiyan': 'Digital literacy certificate, access to digital services, e-governance',
    'PM Gati Shakti': 'Infrastructure development, connectivity, logistics efficiency, economic growth'
  };
  return benefits[schemeName] || 'As per scheme guidelines';
}

// Store current scheme official link
let currentSchemeLink = '';

function openOfficialLink() {
  if (currentSchemeLink) {
    window.open(currentSchemeLink, '_blank', 'noopener,noreferrer');
  }
}

function closeModal() {
  $("modalLayer").classList.add("hidden");
  $("schemeFormArea").innerHTML = '';
  $("schemeOfficialLinkArea").innerHTML = '';
  currentSchemeLink = '';
  const officialBtn = $("schemeOfficialBtn");
  if (officialBtn) officialBtn.style.display = 'none';
}

/* ---------- utilities ---------- */
function capitalize(s) { return (s || '').toString().charAt(0).toUpperCase() + (s || '').toString().slice(1); }

function formatFields(obj) {
  try { return Object.entries(obj).map(([k, v]) => `${k.replace(/^app_/, '')}: ${v}`).join("\n"); }
  catch (e) { return JSON.stringify(obj); }
}

/* ---------- chatbot AI ---------- */
function toggleChatbot() {
  const container = $("chatbotContainer");
  if (!container) return;
  container.classList.toggle("hidden");
  if (!container.classList.contains("hidden")) {
    $("chatbotInput")?.focus();
  }
}

function handleChatbotKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatbotMessage();
  }
}

function sendChatbotMessage() {
  const input = $("chatbotInput");
  const messagesContainer = $("chatbotMessages");
  if (!input || !messagesContainer) return;

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // Add user message to chat
  addChatMessage(userMessage, 'user');
  input.value = '';

  // Simulate thinking delay
  setTimeout(() => {
    const botResponse = getBotResponse(userMessage);
    addChatMessage(botResponse, 'bot');
  }, 500);
}

function addChatMessage(text, sender) {
  const messagesContainer = $("chatbotMessages");
  if (!messagesContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  messageDiv.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getBotResponse(userMessage) {
  const message = userMessage.toLowerCase();

  // Greetings
  if (message.match(/\b(hi|hello|hey|namaste|greetings)\b/)) {
    return "Hello! Welcome to Smart Panchayat. How can I assist you today?";
  }

  // Services
  if (message.match(/\b(service|services|certificate|certificates|apply|application)\b/)) {
    return "We offer various village services including: Water Connection, Electricity, Birth Certificate, Death Certificate, Pension, and Ration Card. You can apply for these from the 'Village Services' section in the sidebar. Would you like details about any specific service?";
  }

  // Birth Certificate
  if (message.match(/\b(birth|birth certificate|birth cert)\b/)) {
    return "To apply for a Birth Certificate, go to 'Village Services' → 'Birth Certificate'. You'll need to provide: Child's Name, Parent's Name, and Birth Date. The application will be reviewed by the Panchayat office.";
  }

  // Death Certificate
  if (message.match(/\b(death|death certificate|death cert)\b/)) {
    return "For a Death Certificate, visit 'Village Services' → 'Death Certificate'. Required information: Deceased Name, Death Date, and Cause of Death.";
  }

  // Water/Electricity
  if (message.match(/\b(water|water connection|drinking water)\b/)) {
    return "Water connection applications are available in 'Village Services' → 'Water Connection'. You'll need: Full Name, Address, and Phone Number.";
  }

  if (message.match(/\b(electricity|electric|power|meter)\b/)) {
    return "Electricity connection applications are in 'Village Services' → 'Electricity'. Required details: Full Name, Address, and Meter Type.";
  }

  // Pension
  if (message.match(/\b(pension|retirement|old age)\b/)) {
    return "Pension applications can be submitted from 'Village Services' → 'Pension'. You'll need: Full Name, Age, and Aadhaar Number.";
  }

  // Ration Card
  if (message.match(/\b(ration|ration card|food|subsidy)\b/)) {
    return "For Ration Card, go to 'Village Services' → 'Ration Card'. Provide: Full Name and Number of Family Members.";
  }

  // Schemes
  if (message.match(/\b(scheme|schemes|government|govt|benefit|benefits)\b/)) {
    return "We have several government schemes available: PM Kisan (farmer income support), Ayushman Bharat (health insurance), Digital Village (connectivity), Clean Panchayat (sanitation), and Education Aid (scholarships). Check the 'Schemes' section for details and to apply.";
  }

  // Complaints
  if (message.match(/\b(complaint|grievance|issue|problem|report)\b/)) {
    return "To register a complaint, go to 'Complaints' section and click 'Register Complaint'. You can report issues like water problems, road conditions, etc. All complaints are tracked with a unique ID.";
  }

  // Applications Status
  if (message.match(/\b(application|applications|status|my apps|track|pending)\b/)) {
    return "To view your applications and their status, go to 'My Applications' in the sidebar. You'll see all your submitted forms with their IDs, types, dates, and current status (Pending/Approved/Rejected).";
  }

  // Events
  if (message.match(/\b(event|events|meeting|camp|sabha|gram sabha)\b/)) {
    return "Upcoming events include: Gram Sabha (community meeting), Health Camps (free checkups), and Tree Plantation drives. Check the 'Events' section for dates and details.";
  }

  // Navigation help
  if (message.match(/\b(navigate|menu|sidebar|where|how to|guide|help)\b/)) {
    return "Use the sidebar menu to navigate: Home (dashboard), Village Services (apply for certificates/services), My Applications (view submitted forms), Complaints (register/view grievances), Schemes (government benefits), and Events (upcoming activities).";
  }

  // Help/Support
  if (message.match(/\b(help|support|assist|guide|what can|what do)\b/)) {
    return "I can help you with: Understanding available services, Applying for certificates (Birth, Death, Water, Electricity, Pension, Ration Card), Information about government schemes, Registering complaints, Checking application status, and Event details. What would you like to know?";
  }

  // Default responses with context awareness
  if (message.match(/\b(thank|thanks|thank you)\b/)) {
    return "You're welcome! If you need any more assistance, feel free to ask.";
  }

  if (message.match(/\b(bye|goodbye|exit|close)\b/)) {
    return "Thank you for using Smart Panchayat. Have a great day!";
  }

  // AI-powered contextual response
  const contextualResponses = [
    "I understand you're asking about: '" + userMessage + "'. Could you please rephrase or be more specific? I can help with services, schemes, complaints, or navigation.",
    "That's an interesting question. In Smart Panchayat, I can assist with village services, government schemes, complaints, and application tracking. What specific help do you need?",
    "I'm here to help with Smart Panchayat services. You can ask me about: applying for certificates, government schemes, registering complaints, or checking application status. What would you like to know?",
    "For assistance with Smart Panchayat, please specify if you need help with: Services (water, electricity, certificates), Schemes (government benefits), Complaints, or Applications (status tracking)."
  ];

  // Use message length and keywords to provide more contextual response
  const randomIndex = Math.floor(Math.random() * contextualResponses.length);
  return contextualResponses[randomIndex];
}

/* ---------- success modal ---------- */
function showSuccessModal(title, message, appId) {
  $("successTitle").innerText = title;
  $("successMessage").innerHTML = message.replace(/\n/g, '<br>');
  $("successAppId").innerHTML = appId ? appId.replace(/\n/g, '<br>') : "";
  $("successViewBtn").style.display = 'inline-block';
  $("successModalLayer").classList.remove("hidden");
}

function closeSuccessModal() {
  $("successModalLayer").classList.add("hidden");
}

function viewApplications() {
  closeSuccessModal();
  loadContent("applications");
  // Navigate to applications section
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const appsBtn = [...document.querySelectorAll(".nav-item")].find(b => b.textContent.toLowerCase().includes('applications'));
  if (appsBtn) appsBtn.classList.add("active");
}

/* ---------- Events from Backend ---------- */
async function loadEventsFromBackend() {
  const area = $("eventsArea");
  if (!area) return;

  try {
    const events = await BackendAPI.events.getAll();
    const user = sessionStorage.getItem("sp_user") || 'guest';
    const userType = sessionStorage.getItem("sp_userType") || "user";

    if (events.length === 0) {
      area.innerHTML = `<p style="text-align:center;padding:40px;color:var(--muted);">No events scheduled at the moment.</p>`;
      return;
    }

    // Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    let html = `<div class="cards-grid events-grid">`;
    events.forEach(event => {
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const formattedTime = eventDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const isRegistered = Array.isArray(event.attendees)
        ? event.attendees.includes(user)
        : false;

      html += `
        <div class="card event-card" data-event-id="${event.id}">
          <div class="event-header">
            <i class="${event.icon || 'fas fa-calendar'}"></i>
            <span class="event-type">${event.type}</span>
          </div>
          <h4>${event.title}</h4>
          <p class="event-desc">${event.description}</p>
          <div class="event-details">
            <div class="event-detail-item">
              <i class="fas fa-calendar-alt"></i>
              <span>${formattedDate}</span>
            </div>
            <div class="event-detail-item">
              <i class="fas fa-clock"></i>
              <span>${formattedTime}</span>
            </div>
            <div class="event-detail-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${event.location}</span>
            </div>
            <div class="event-detail-item">
              <i class="fas fa-users"></i>
              <span>${typeof event.attendees === 'number' ? event.attendees : (event.attendees?.length || 0)} Registered</span>
            </div>
          </div>
          <div class="event-actions">
            <button class="btn ${isRegistered ? 'ghost' : 'primary'} small" 
                    onclick="registerForEvent('${event.id}')" 
                    ${(isRegistered || userType === "admin") ? 'disabled' : ''}>
              <i class="fas fa-${isRegistered ? 'check' : 'user-plus'}"></i> 
              ${userType === "admin" ? 'Admin Posted' : (isRegistered ? 'Going' : "I'm Going")}
            </button>
            <button class="btn ghost small" onclick="viewEventDetails('${event.id}')">
              <i class="fas fa-info-circle"></i> Details
            </button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    area.innerHTML = html;

    // Show follow-up after loading events
    setTimeout(() => showDashboardFollowUp('events'), 500);
  } catch (error) {
    area.innerHTML = `<p style="text-align:center;padding:40px;color:#ef4444;">Error loading events. Please try again.</p>`;
    console.error('Error loading events:', error);
  }
}

async function registerForEvent(eventId) {
  const user = sessionStorage.getItem("sp_user") || 'guest';
  if (!user || user === 'guest') {
    alert('Please login to register for events.');
    return;
  }

  try {
    const result = await BackendAPI.events.registerForEvent(eventId, user);
    if (result.success) {
      alert(result.message);
      loadEventsFromBackend(); // Reload events
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert('Error registering for event. Please try again.');
    console.error('Error:', error);
  }
}

function viewEventDetails(eventId) {
  // Show event details modal
  BackendAPI.events.getAll().then(events => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      const eventDate = new Date(event.date);
      showEventDetailsModal(event);
    }
  });
}

function showEventDetailsModal(event) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  $("eventModalTitle").innerText = event.title;
  $("eventModalDesc").innerText = event.description;
  $("eventModalDate").innerHTML = `<i class="fas fa-calendar"></i> ${formattedDate}`;
  $("eventModalTime").innerHTML = `<i class="fas fa-clock"></i> ${eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  $("eventModalLocation").innerHTML = `<i class="fas fa-map-marker-alt"></i> ${event.location}`;
  $("eventModalOrganizer").innerHTML = `<i class="fas fa-user-tie"></i> ${event.organizer}`;
  $("eventModalAttendees").innerText = typeof event.attendees === 'number' ? event.attendees : (event.attendees?.length || 0);
  $("eventRegisterBtn").onclick = () => {
    closeEventModal();
    registerForEvent(event.id);
  };
  $("eventModalLayer").classList.remove("hidden");
}

/* ---------- Admin Event Management ---------- */
async function renderAdminEventsManager() {
  const listArea = $("adminEventsList");
  if (!listArea) return;

  listArea.innerHTML = `<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="color:var(--accent);"></i></div>`;

  try {
    const events = await BackendAPI.events.getAll();
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!events.length) {
      listArea.innerHTML = `<div class="card"><p class="muted">No events posted yet.</p></div>`;
      return;
    }

    let html = `<div class="card"><h4 style="margin-bottom:10px;">Posted Events</h4><div style="display:grid;gap:10px;">`;
    events.forEach(event => {
      const dateText = new Date(event.date).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
      const attendeeList = Array.isArray(event.attendees) ? event.attendees : [];
      const attendeeCount = attendeeList.length;
      const attendeeHtml = attendeeCount
        ? attendeeList.map(name => `<span class="event-attendee-chip">${name}</span>`).join("")
        : `<span class="muted small">No one has registered yet.</span>`;

      html += `
        <div class="admin-event-item">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:220px;">
              <strong>${event.title}</strong>
              <div class="muted small">${event.type || "event"} • ${dateText} • ${event.location || "Village"}</div>
            </div>
            <button class="btn ghost small" onclick="removeAdminEvent('${event.id}')"><i class="fas fa-trash"></i> Delete</button>
          </div>
          <p style="margin:8px 0 0 0;">${event.description || ""}</p>
          <div class="admin-event-attendees-wrap">
            <div class="admin-event-attendees-title"><i class="fas fa-users"></i> Registered Users (${attendeeCount})</div>
            <div class="admin-event-attendees-list">${attendeeHtml}</div>
          </div>
        </div>`;
    });
    html += `</div></div>`;
    listArea.innerHTML = html;
  } catch (error) {
    console.error("Error loading admin events:", error);
    listArea.innerHTML = `<div class="card"><p style="color:#ef4444;">Could not load events.</p></div>`;
  }
}

async function createAdminEvent() {
  const msg = $("adminEventMsg");
  const title = $("adminEventTitle")?.value?.trim();
  const type = $("adminEventType")?.value;
  const date = $("adminEventDateTime")?.value;
  const location = $("adminEventLocation")?.value?.trim();
  const description = $("adminEventDescription")?.value?.trim();

  if (!title || !type || !date || !location || !description) {
    if (msg) {
      msg.style.color = "#ef4444";
      msg.innerText = "Please fill all event details.";
    }
    return;
  }

  const selectedDate = new Date(date);
  if (Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) {
    if (msg) {
      msg.style.color = "#ef4444";
      msg.innerText = "Please choose a future date/time.";
    }
    return;
  }

  try {
    await BackendAPI.events.createEvent({
      title,
      type,
      description,
      date: selectedDate.toISOString(),
      location,
      organizer: "Village Administration",
      icon: "fas fa-calendar-check"
    });

    if (msg) {
      msg.style.color = "#10b981";
      msg.innerText = "Event posted successfully.";
    }
    ["adminEventTitle", "adminEventDateTime", "adminEventLocation", "adminEventDescription"].forEach(id => {
      const el = $(id);
      if (el) el.value = "";
    });
    if ($("adminEventType")) $("adminEventType").value = "";
    renderAdminEventsManager();
  } catch (error) {
    console.error("Error posting event:", error);
    if (msg) {
      msg.style.color = "#ef4444";
      msg.innerText = error.message || "Failed to post event.";
    }
  }
}

async function removeAdminEvent(eventId) {
  if (!confirm("Delete this event?")) return;
  try {
    await BackendAPI.events.deleteEvent(eventId);
    renderAdminEventsManager();
    if ($("eventsArea")) loadEventsFromBackend();
  } catch (error) {
    alert(error.message || "Could not delete event.");
  }
}

/* ---------- Admin Complaint Functions ---------- */
function renderAdminComplaints() {
  const area = $("adminComplaintsList");
  if (!area) return;
  area.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin fa-2px color-accent"></i></div>';

  fetch('/api/admin/complaints')
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        area.innerHTML = '<p class="error">Failed to load complaints.</p>';
        return;
      }
      const complaints = data.complaints;
      if (!complaints.length) {
        area.innerHTML = '<p>No complaints found.</p>';
        return;
      }

      let html = `<div style="overflow-x:auto;">
        <table style="width:100%;">
          <tr><th>ID / Date</th><th>User / Name</th><th>Type / Desc</th><th>Status</th><th>Actions</th></tr>`;

      complaints.forEach(c => {
        const dateStr = new Date(c.createdAt).toLocaleDateString('en-IN');
        const statusColor = c.status === 'Resolved' ? '#10b981' : (c.status === 'In Progress' ? '#f59e0b' : '#3b82f6');

        // Escape content safely for modal
        const safeDesc = (c.description || '').replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\\n/g, "\\n");
        const safeResp = (c.adminResponse || '').replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\\n/g, "\\n");

        html += `<tr>
          <td>
            <strong>${c.complaintId}</strong><br>
            <small class="muted">${dateStr}</small>
          </td>
          <td>
            <strong>${c.applicantName}</strong><br>
            <small class="muted">@${c.username}</small>
          </td>
          <td>
            <strong>${c.type}</strong><br>
            <small style="display:block;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${c.description}">${c.description}</small>
          </td>
          <td><span style="background:${statusColor}20;color:${statusColor};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${c.status}</span></td>
          <td>
            <button class="btn small primary" onclick="showComplaintActionModal('${c.complaintId}', '${safeDesc}', '${c.status}', '${safeResp}')">
               Take Action
            </button>
          </td>
        </tr>`;
      });
      html += `</table></div>`;
      area.innerHTML = html;
    })
    .catch(err => {
      console.error(err);
      area.innerHTML = '<p class="error">Error loading tickets.</p>';
    });
}

function showComplaintActionModal(id, description, currentStatus, currentResponse) {
  const modalHTML = `
    <h3>Ticket Action: ${id}</h3>
    <p><strong>Description:</strong></p>
    <div style="background:#f3f4f6;padding:10px;border-radius:6px;max-height:100px;overflow-y:auto;margin-bottom:15px;white-space:pre-wrap;">${description}</div>
    
    <label style="display:block;margin-bottom:6px;font-weight:500;">Update Status:</label>
    <select id="actionComplaintStatus" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ccc;border-radius:6px;">
      <option value="Open" ${currentStatus === 'Open' ? 'selected' : ''}>Open</option>
      <option value="In Progress" ${currentStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
      <option value="Resolved" ${currentStatus === 'Resolved' ? 'selected' : ''}>Resolved</option>
    </select>
    
    <label style="display:block;margin-bottom:6px;font-weight:500;">Admin Response:</label>
    <textarea id="actionComplaintResponse" rows="4" placeholder="Type your response to the user here..." style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;">${currentResponse || ''}</textarea>
    
    <div style="display:flex;gap:10px;margin-top:15px;">
      <button class="btn primary" onclick="updateComplaintStatus('${id}')" style="flex:1;">Update Ticket</button>
      <button class="btn ghost" onclick="closeModal()" style="flex:1;">Cancel</button>
    </div>
  `;

  const schemeModal = document.getElementById('schemeModal');
  const modalLayer = document.getElementById('modalLayer');

  if (schemeModal && modalLayer) {
    schemeModal.innerHTML = modalHTML;
    modalLayer.classList.remove('hidden');
  }
}

function updateComplaintStatus(id) {
  const status = document.getElementById('actionComplaintStatus').value;
  const adminResponse = document.getElementById('actionComplaintResponse').value;

  fetch('/api/admin/complaints/' + id + '/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, adminResponse })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        closeModal();
        renderAdminComplaints(); // refresh list
      } else {
        alert("Failed to update status: " + data.message);
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error updating status.");
    });
}