// ─────────────────────────────────────────────
//  Tessolve HR Portal v2 — Full App Logic
//  Changes: Billable/Bench, KPI scoring, notifications,
//  pagination, manager view-only helpdesk, feedback pagination
// ─────────────────────────────────────────────

// ── Persistent State ─────────────────────────
let currentUser = null;
let currentPage = 'dashboard';

const load  = (k,d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } };
const save  = (k,v) => localStorage.setItem(k, JSON.stringify(v));

const store = {
  get issues()    { return load('tsl_issues',   []); },
  get feedback()  { return load('tsl_feedback', []); },
  get resumes()   { return load('tsl_resumes',  {}); },
  get billable()  { return load('tsl_billable', {}); },  // { empId: true/false }
  get kpi()       { return load('tsl_kpi',      {}); },  // { empId: { key: val } }
  get notifs()    { return load('tsl_notifs',   {}); },  // { empId: [notif] }
  saveIssues(v)   { save('tsl_issues',   v); },
  saveFeedback(v) { save('tsl_feedback', v); },
  saveResumes(v)  { save('tsl_resumes',  v); },
  saveBillable(v) { save('tsl_billable', v); },
  saveKpi(v)      { save('tsl_kpi',      v); },
  saveNotifs(v)   { save('tsl_notifs',   v); },
};

// ── Resume Parser ─────────────────────────────
function parseResume(text) {
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  let name = '';
  for (const l of lines.slice(0,8)) {
    if (!/[@\d\+\(\)\/]/.test(l) && l.split(' ').length<=5 && l.length>3) { name=l; break; }
  }
  const emailM = text.match(/[\w.\-+]+@[\w.\-]+\.[a-z]{2,}/i);
  const phoneM = text.match(/(\+?\d[\d\s\-().]{8,14}\d)/);
  const skillKw = ['python','java','javascript','typescript','react','angular','vue','node','c++','c#','sql','mysql',
    'postgresql','mongodb','aws','azure','gcp','docker','kubernetes','git','linux','machine learning','deep learning',
    'tensorflow','pytorch','excel','power bi','tableau','jira','selenium','embedded','vhdl','verilog','fpga','pcb',
    'analog','digital','vlsi','soc','embedded c','rtos','matlab','simulink','arm','iot','firmware','scrum','agile'];
  const lower = text.toLowerCase();
  const skills = skillKw.filter(s=>lower.includes(s));
  const eduKw  = ['b.e','b.tech','m.tech','m.e','mba','bca','mca','b.sc','m.sc','phd','bachelor','master','degree'];
  const education = lines.filter(l=>eduKw.some(k=>l.toLowerCase().includes(k))).slice(0,3);
  const expM  = text.match(/(\d+\.?\d*)\s*\+?\s*years?\s*(of\s*)?(experience|exp)/i);
  const expSec = text.match(/experience[\s\S]{0,2000}?(?=education|skills|projects|certif|$)/i);
  const jobLines = expSec ? expSec[0].split('\n').map(l=>l.trim()).filter(l=>l.length>10&&l.length<100).slice(1,8) : [];
  const certM  = text.match(/certif[\s\S]{0,500}?(?=\n\n|\Z)/i);
  const certs  = certM ? certM[0].split('\n').map(l=>l.trim()).filter(Boolean).slice(1,5) : [];
  const sumM   = text.match(/(?:summary|objective|profile)[\s\S]{0,400}?(?=\n\n)/i);
  const summary = sumM ? sumM[0].replace(/^(summary|objective|profile)[:\-\s]*/i,'').trim().slice(0,300) : '';
  return { name, email:emailM?emailM[0]:'', phone:phoneM?phoneM[0].trim():'',
    skills, education, experience:expM?expM[0]:'', jobLines, certs, summary };
}

// ── Auth ──────────────────────────────────────
function login() {
  const id   = document.getElementById('loginId').value.trim();
  const pass = document.getElementById('loginPass').value;
  const role = document.getElementById('loginRole').value;
  const emp  = EMPLOYEES_DB[id];
  if (!emp)             return showAlert('loginAlert','Employee ID not found.');
  if (emp.password !== pass) return showAlert('loginAlert','Incorrect password.');
  if (emp.role !== role)     return showAlert('loginAlert',`This account is a "${emp.role}", not "${role}".`);
  currentUser = emp;
  save('tsl_session', emp);
  renderApp();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('tsl_session');
  currentPage = 'dashboard';
  renderAuth();
}

function signup() {
  const id   = document.getElementById('signupId').value.trim();
  const pass = document.getElementById('signupPass').value;
  const role = document.getElementById('signupRole').value;
  if (!id || !pass) return showAlert('signupAlert','All fields required.');
  const emp = EMPLOYEES_DB[id];
  if (!emp)             return showAlert('signupAlert','Employee ID not found. Contact HR.');
  if (emp.role !== role) return showAlert('signupAlert',`Your designated role is "${emp.role}".`);
  showAlert('signupAlert',`Welcome, ${emp.name}! Account ready. Please log in.`,'success');
  setTimeout(()=>switchAuthTab('login'),1500);
}

// ── Auth UI ───────────────────────────────────
function renderAuth() {
  document.getElementById('app').innerHTML = `
  <div style="min-height:100vh;background:#000;display:flex;align-items:center;justify-content:center;padding:2rem;">
    <div style="width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;">
    <div style="position:fixed;top:1.5rem;right:1.5rem;">
  <div class="theme-toggle" onclick="toggleTheme()" title="Toggle light/dark"></div>
</div>
      <img src="logo.png" alt="Tessolve" style="width:280px;max-width:90%;margin-bottom:2.5rem;object-fit:contain;filter:drop-shadow(0 4px 24px rgba(252,135,1,.3))"/>
      <div style="width:100%;background:var(--surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);padding:2rem;">
        <div id="auth-form-area">${loginForm()}</div>
      </div>
    </div>
  </div>`;
}

function loginForm() {
  return `<div id="loginAlert"></div>
  <div class="form-group"><label>Employee ID</label><input type="text" id="loginId" placeholder="e.g. 10191"/></div>
  <div class="form-group"><label>Password</label><input type="password" id="loginPass" placeholder="Your Employee ID is your password" onkeydown="if(event.key==='Enter')login()"/></div>
  <div class="form-group"><label>Login As</label><select id="loginRole">
    <option value="employee">Employee</option>
    <option value="techlead">Tech Lead (L1)</option>
    <option value="manager">Manager (L2)</option>
  </select></div>
  <button class="btn btn-primary w-full btn-lg" onclick="login()">Sign In →</button>
  <p style="font-size:.75rem;color:var(--text-muted);margin-top:1rem;text-align:center">💡 Your password is your Employee ID</p>`;
}

function signupForm() {
  return `<div id="signupAlert"></div>
  <div class="form-group"><label>Employee ID</label><input type="text" id="signupId" placeholder="Your employee ID"/></div>
  <div class="form-group"><label>Your Role</label><select id="signupRole">
    <option value="employee">Employee</option>
    <option value="techlead">Tech Lead (L1)</option>
    <option value="manager">Manager (L2)</option>
  </select></div>
  <div class="form-group"><label>Create Password</label><input type="password" id="signupPass" placeholder="Choose a password"/></div>
  <button class="btn btn-primary w-full btn-lg" onclick="signup()">Create Account</button>`;
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab==='login');
  document.getElementById('tab-signup').classList.toggle('active', tab==='signup');
  document.getElementById('auth-form-area').innerHTML = tab==='login' ? loginForm() : signupForm();
}

// ── App Shell ─────────────────────────────────
function renderApp() {
  const u = currentUser;
  const initials = u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const roleLabel = {employee:'Employee',techlead:'Tech Lead (L1)',manager:'Manager (L2)'}[u.role];
  const roleBadge = {employee:'badge-green',techlead:'badge-blue',manager:'badge-orange'}[u.role];

  document.getElementById('app').innerHTML = `
  <div class="app-layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo"><img src="logo.png" alt="Tessolve" style="height:32px;object-fit:contain"/></div>
      <nav class="sidebar-nav" id="sidebarNav"></nav>
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-avatar">${initials}</div>
          <div class="user-info">
            <div class="name">${u.name}</div>
            <div class="role"><span class="badge ${roleBadge}" style="font-size:.65rem">${roleLabel}</span></div>
          </div>
        </div>
        <div style="display:flex;gap:.5rem;align-items:center">
          <div class="theme-toggle" onclick="toggleTheme()" title="Toggle dark mode"></div>
          <button class="btn btn-outline btn-sm flex-1" onclick="logout()">🚪 Sign out</button>
        </div>
      </div>
    </aside>
    <div class="main-content">
      <div id="pageArea"></div>
    </div>
  </div>`;

  navigateTo(currentPage);
}

function getNavItems() {
  const r = currentUser.role;
  const nav = [
    {id:'dashboard', icon:'', label:'Dashboard'},
  ];
  if (r !== 'manager') nav.push({id:'resume', icon:'📄', label:'My Resume'});
  nav.push({id:'kpi', icon:'', label:r==='manager'?'Team KPI':'My KPI'});
  if (r === 'employee') {
    nav.push({id:'help', icon:'', label:'Help & Issues'});
  }
  if (r === 'techlead') {
    nav.push({id:'team',     icon:'', label:'My Team'});
    nav.push({id:'billable', icon:'', label:'Billable / Bench'});
    nav.push({id:'feedback', icon:'', label:'Feedback'});
    nav.push({id:'help',     icon:'', label:'Help & Issues'});
  }
  if (r === 'manager') {
    nav.push({id:'org',         icon:'', label:'My Teams'});
    nav.push({id:'mgr-kpi',     icon:'', label:'KPI Scores'});
    nav.push({id:'mgr-comments',icon:'', label:'Comments'});
    nav.push({id:'mgr-helpdesk',icon:'', label:'Helpdesk (View)'});
    nav.push({id:'help',        icon:'', label:'Help & Issues'});
  }
  return nav;
}

function navigateTo(page) {
  currentPage = page;
  const nav = document.getElementById('sidebarNav');
  if (nav) {
    nav.innerHTML = getNavItems().map(n=>`
      <div class="nav-item${currentPage===n.id?' active':''}" onclick="navigateTo('${n.id}')">
        <span class="icon">${n.icon}</span>${n.label}
      </div>`).join('');
  }
  renderPage(page);
}

function renderPage(page) {
  const pages = {
    dashboard:      renderDashboard,
    resume:         renderResumePage,
    kpi:            renderKpiPage,
    help:           renderHelpPage,
    team:           renderTeamPage,
    feedback:       renderFeedbackPage,
    org:            renderOrgPage,
    billable:       renderBillablePage,
    'mgr-kpi':      renderMgrKpiPage,
    'mgr-comments': renderMgrComments,
    'mgr-helpdesk': renderMgrHelpdesk,
  };
  const fn = pages[page] || renderDashboard;
  document.getElementById('pageArea').innerHTML = fn();
}

// ── Notification helpers ──────────────────────
function addNotif(empId, notif) {
  const notifs = store.notifs;
  if (!notifs[empId]) notifs[empId] = [];
  notifs[empId].unshift({...notif, id: Date.now(), read: false, date: new Date().toLocaleDateString()});
  store.saveNotifs(notifs);
}

function getMyNotifs() {
  const notifs = store.notifs;
  return (notifs[currentUser.id] || []);
}

function markNotifsRead() {
  const notifs = store.notifs;
  if (notifs[currentUser.id]) {
    notifs[currentUser.id].forEach(n => n.read = true);
    store.saveNotifs(notifs);
  }
}

// ── Dashboard ─────────────────────────────────
function renderDashboard() {
  const u = currentUser;
  const direct = getDirectReportees(u.id);
  const all    = getAllSubordinates(u.id);
  const resumes = store.resumes;
  const feedback = store.feedback;
  const myFeedback = feedback.filter(f=>f.empId===u.id);
  const myNotifs = getMyNotifs().filter(n=>!n.read);
  const billable = store.billable;
  const amBillable = billable[u.id] === true;
  const hasResume  = !!resumes[u.id];
  const greet = ['Good morning','Good afternoon','Good evening'][Math.floor(new Date().getHours()/8)] || 'Hello';

  // Notification banner for employees marked billable without resume
  let notifBanner = '';
  if (u.role === 'employee') {
    if (amBillable && !hasResume) {
      notifBanner = `<div class="notif-banner">
        <div class="notif-icon">🔔</div>
        <div>
          <h3>Action Required: Upload Your Resume</h3>
          <p>Your Tech Lead has added you as <strong>Billable</strong>. Please upload your resume immediately so it can be shared with clients.</p>
        </div>
        <button class="btn btn-outline" style="color:#fff;border-color:rgba(255,255,255,.5);white-space:nowrap" onclick="navigateTo('resume')">Upload Now →</button>
      </div>`;
    } else if (amBillable && hasResume) {
      notifBanner = `<div class="alert alert-success" style="margin-bottom:1.5rem">✅ Your Tech Lead has marked you as <strong>Billable</strong>. Your resume is uploaded. Your data has been updated — you'll be notified once a project is assigned.</div>`;
    } else if (!amBillable) {
      notifBanner = `<div class="alert alert-info" style="margin-bottom:1.5rem">ℹ You are currently <strong>not billable (on bench)</strong>. Check with your Tech Lead if you have questions.</div>`;
    }
  }

  // Unread notifs
  let notifHtml = '';
  if (myNotifs.length > 0) {
    notifHtml = `<div class="card" style="margin-bottom:1.5rem">
      <div class="card-header"><h3>🔔 Notifications (${myNotifs.length} new)</h3><button class="btn btn-ghost btn-sm" onclick="markNotifsRead();navigateTo('dashboard')">Mark read</button></div>
      <div class="card-body">${myNotifs.slice(0,3).map(n=>`
        <div class="alert alert-info" style="margin-bottom:.5rem"><span>${n.icon||'📢'}</span><div><strong>${n.title}</strong><br/><span style="font-size:.8rem">${n.message}</span></div></div>`).join('')}
      </div>
    </div>`;
  }

  return `
  <div class="topbar">
    <div class="topbar-title"><h2>Dashboard</h2><p>${greet}, ${u.name.split(' ')[0]}! </p></div>
    <div class="topbar-actions">
      <span class="badge badge-gray">ID: ${u.id}</span>
      ${myNotifs.length ? `<span class="badge badge-orange">🔔 ${myNotifs.length}</span>` : ''}
    </div>
  </div>
  <div class="page-content">
    ${notifBanner}
    ${notifHtml}
    <div class="profile-hero">
      <div class="profile-avatar-lg">${u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
      <div class="profile-hero-info">
        <h2>${u.name}</h2>
        <p>Emp ID: ${u.id} &nbsp;•&nbsp; ${{employee:'Employee',techlead:'Tech Lead (L1)',manager:'Manager (L2)'}[u.role]}</p>
        ${u.reportsTo ? `<p>Reports to: ${EMPLOYEES_DB[u.reportsTo]?.name||u.reportsTo}</p>` : '<p>Top-level leader</p>'}
        ${u.role==='employee' ? `<p>${amBillable?'<span style="color:#9ae6b4">● Billable</span>':'<span style="color:rgba(255,255,255,.5)">● On Bench</span>'}</p>` : ''}
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-card orange"><div class="stat-icon">👥</div><div class="stat-value">${direct.length}</div><div class="stat-label">Direct Reports</div></div>
      <div class="stat-card blue"><div class="stat-icon">🌳</div><div class="stat-value">${all.length}</div><div class="stat-label">Total Team</div></div>
      <div class="stat-card green"><div class="stat-icon">📄</div><div class="stat-value">${hasResume?'✓':'—'}</div><div class="stat-label">Resume</div></div>
      <div class="stat-card purple"><div class="stat-icon">💬</div><div class="stat-value">${myFeedback.length}</div><div class="stat-label">Feedback</div></div>
    </div>
    ${myFeedback.length ? `<div class="card"><div class="card-header"><h3>💬 Recent Feedback</h3></div><div class="card-body">
      ${myFeedback.slice(-3).reverse().map(f=>`<div class="comment-card"><div class="comment-meta"><span>From: ${f.fromName}</span><span>${f.date}</span></div><div class="comment-text">${f.text}</div></div>`).join('')}
    </div></div>` : ''}
  </div>`;
}

// ── Resume Page ───────────────────────────────
function renderResumePage() {
  const res = store.resumes[currentUser.id];
  return `
  <div class="topbar"><div class="topbar-title"><h2>📄 My Resume</h2><p>Upload and view your parsed resume</p></div></div>
  <div class="page-content">
    ${!res ? `
    <div class="card"><div class="card-body">
      <div class="upload-zone" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="dropFile(event)">
        <input type="file" accept=".txt,.pdf,.doc,.docx" onchange="handleResumeFile(event)"/>
        <span class="upload-icon">📂</span>
        <h3>Drop your resume here</h3>
        <p>Supports .txt, .pdf, .doc, .docx &nbsp;•&nbsp; Click or drag to upload</p>
      </div>
    </div></div>` : `
    <div style="display:flex;gap:.75rem;margin-bottom:1.5rem;flex-wrap:wrap">
      <button class="btn btn-outline btn-sm" onclick="clearMyResume()">🔄 Re-upload</button>
      <a class="btn btn-secondary btn-sm" href="${res.dataUrl}" download="${currentUser.name.replace(/ /g,'_')}_Resume.txt">⬇ Download</a>
    </div>
    ${renderParsedResume(res.parsed)}`}
  </div>`;
}

function renderParsedResume(p, empName) {
  const displayName = p.name || empName || '';
  return `
  <div class="profile-hero">
    <div class="profile-avatar-lg">${displayName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?'}</div>
    <div class="profile-hero-info">
      <h2>${displayName}</h2>
      ${p.email?`<p>📧 ${p.email}</p>`:''}
      ${p.phone?`<p>📞 ${p.phone}</p>`:''}
      ${p.experience?`<p>⏱ ${p.experience}</p>`:''}
    </div>
  </div>
  <div class="grid-2">
    <div class="card"><div class="card-header"><h3>🛠 Skills</h3></div><div class="card-body">
      ${p.skills.length?`<div class="tag-cloud">${p.skills.map(s=>`<span class="tag">${s}</span>`).join('')}</div>`:'<p>No skills detected</p>'}
    </div></div>
    <div class="card"><div class="card-header"><h3>🎓 Education</h3></div><div class="card-body">
      ${p.education.length?p.education.map(e=>`<p style="margin-bottom:.5rem">• ${e}</p>`).join(''):'<p>Not detected</p>'}
    </div></div>
    ${p.summary?`<div class="card" style="grid-column:span 2"><div class="card-header"><h3>📝 Summary</h3></div><div class="card-body"><p>${p.summary}</p></div></div>`:''}
    ${p.jobLines.length?`<div class="card" style="grid-column:span 2"><div class="card-header"><h3>💼 Experience</h3></div><div class="card-body">${p.jobLines.map(j=>`<p style="margin-bottom:.375rem">• ${j}</p>`).join('')}</div></div>`:''}
    ${p.certs.length?`<div class="card"><div class="card-header"><h3>🏅 Certifications</h3></div><div class="card-body">${p.certs.map(c=>`<p style="margin-bottom:.375rem">• ${c}</p>`).join('')}</div></div>`:''}
  </div>`;
}

function handleResumeFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    const parsed = parseResume(text);
    const dataUrl = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    const resumes = store.resumes;
    resumes[currentUser.id] = { parsed, dataUrl, filename:file.name, uploadedAt:new Date().toLocaleDateString() };
    store.saveResumes(resumes);
    renderPage('resume');
  };
  reader.readAsText(file);
}

function clearMyResume() {
  if (!confirm('Remove your current resume?')) return;
  const resumes = store.resumes; delete resumes[currentUser.id]; store.saveResumes(resumes);
  renderPage('resume');
}

function dragOver(e)  { e.preventDefault(); document.querySelector('.upload-zone')?.classList.add('drag-over'); }
function dragLeave()  { document.querySelector('.upload-zone')?.classList.remove('drag-over'); }
function dropFile(e)  { e.preventDefault(); dragLeave(); if(e.dataTransfer.files[0]) handleResumeFile({target:{files:e.dataTransfer.files}}); }

// ── KPI Page (Employee/TL view-only) ──────────
function renderKpiPage() {
  const kpiData = store.kpi[currentUser.id] || {};
  const keys = ['Performance Rating','Goal Completion','Attendance','Training Credits','Communication','Technical Skills'];
  return `
  <div class="topbar"><div class="topbar-title"><h2>📊 My KPI</h2><p>Performance indicators — set by your manager</p></div></div>
  <div class="page-content">
    <div class="alert alert-info">ℹ KPI values are set by your manager. You can view but not edit them.</div>
    <div class="kpi-grid" style="margin-top:1rem">
      ${keys.map(k=>`<div class="kpi-item">
        <div class="kpi-val">${kpiData[k]||'—'}</div>
        <div class="kpi-key">${k}</div>
      </div>`).join('')}
    </div>
    <div class="card" style="margin-top:1.5rem">
      <div class="card-header"><h3>🛠 Skills from Resume</h3></div>
      <div class="card-body">
        ${store.resumes[currentUser.id]?.parsed?.skills?.length
          ? `<div class="tag-cloud">${store.resumes[currentUser.id].parsed.skills.map(s=>`<span class="tag">${s}</span>`).join('')}</div>`
          : '<p>Upload your resume to see skill analysis.</p>'}
      </div>
    </div>
  </div>`;
}

// ── Help Page (Employee) ──────────────────────
function renderHelpPage() {
  const myIssues = store.issues.filter(i=>i.empId===currentUser.id);
  return `
  <div class="topbar"><div class="topbar-title"><h2> Help & Issues</h2><p>Raise a ticket to the IT/HR helpdesk</p></div></div>
  <div class="page-content">
    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header"><h3>Submit New Ticket</h3></div>
      <div class="card-body">
        <div class="alert alert-info">Your Employee ID <strong>${currentUser.id}</strong> is attached automatically.</div>
        <div class="form-group" style="margin-top:1rem">
          <label>Category</label>
          <select id="issueCategory">
            <option>IT / Access Issue</option><option>HR / Payroll</option>
            <option>Infrastructure</option><option>Policy Query</option><option>Other</option>
          </select>
        </div>
        <div class="form-group"><label>Describe your issue</label>
          <textarea id="issueText" rows="4" placeholder="Describe in detail..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="submitIssue()">Submit Ticket</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>My Tickets (${myIssues.length})</h3></div>
      <div class="card-body" style="padding:0">
        ${myIssues.length===0 ? '<div class="empty-state"><div class="empty-icon">🎉</div><h3>No open issues</h3></div>' :
        `<div class="table-wrapper"><table>
          <thead><tr><th>Date</th><th>Category</th><th>Issue</th><th>Status</th></tr></thead>
          <tbody>${myIssues.slice().reverse().map(i=>`<tr>
            <td>${i.date}</td><td>${i.category}</td>
            <td>${i.text.slice(0,60)}${i.text.length>60?'…':''}</td>
            <td><span class="badge badge-${i.status==='Open'?'orange':'green'}">${i.status}</span></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
      </div>
    </div>
  </div>`;
}

function submitIssue() {
  const text = document.getElementById('issueText').value.trim();
  const category = document.getElementById('issueCategory').value;
  if (!text) return alert('Please describe your issue.');
  const issues = store.issues;
  issues.push({ id:Date.now(), empId:currentUser.id, empName:currentUser.name, category, text, date:new Date().toLocaleDateString(), status:'Open' });
  store.saveIssues(issues);
  renderPage('help');
}

// ── Team Page (Tech Lead) ─────────────────────
function renderTeamPage() {
  const direct = getDirectReportees(currentUser.id);
  const resumes = store.resumes;
  return `
  <div class="topbar"><div class="topbar-title"><h2>👥 My Team</h2><p>${direct.length} direct reportees</p></div></div>
  <div class="page-content">
    <div class="card">
      <div class="card-body" style="padding:0">
        ${direct.length===0 ? '<div class="empty-state"><div class="empty-icon">👥</div><h3>No reportees</h3></div>' :
        `<div class="table-wrapper"><table>
          <thead><tr><th>Emp ID</th><th>Name</th><th>Role</th><th>Resume</th><th>Actions</th></tr></thead>
          <tbody>${direct.map(e=>{
            const hasR = !!resumes[e.id];
            return `<tr>
              <td><span class="badge badge-gray">${e.id}</span></td>
              <td><strong>${e.name}</strong></td>
              <td><span class="badge badge-${e.role==='techlead'?'blue':'green'}">${e.role==='techlead'?'TL':'Employee'}</span></td>
              <td>${hasR?'<span class="badge badge-green">✓ Uploaded</span>':'<span class="badge badge-gray">Not uploaded</span>'}</td>
              <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="showEmpDetail('${e.id}')">View Details</button>
                <button class="btn btn-secondary btn-sm" onclick="openFeedbackModal('${e.id}','${e.name.replace(/'/g,"\\'")}')">+ Feedback</button>
                ${hasR?`<a class="btn btn-outline btn-sm" href="${resumes[e.id].dataUrl}" download="${e.name.replace(/ /g,'_')}.txt">⬇ Resume</a>`:''}
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`}
      </div>
    </div>
    <div id="empDetailPanel"></div>
    <div id="modalArea"></div>
  </div>`;
}

function showEmpDetail(empId) {
  const emp = EMPLOYEES_DB[empId];
  const res = store.resumes[empId];
  const fb  = store.feedback.filter(f=>f.empId===empId);
  const kpi = store.kpi[empId] || {};
  const panel = document.getElementById('empDetailPanel');
  if (!panel) return;
  panel.innerHTML = `<div class="card" style="margin-top:1.5rem">
    <div class="card-header"><h3>👤 ${emp.name} (${emp.id})</h3>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('empDetailPanel').innerHTML=''">✕</button>
    </div>
    <div class="card-body">
      ${res ? renderParsedResume(res.parsed, emp.name) : '<div class="alert alert-info">No resume uploaded yet.</div>'}
      ${Object.keys(kpi).length ? `<div class="divider"></div><h4 style="margin-bottom:.75rem">KPI Scores</h4>
        <div class="kpi-grid">${Object.entries(kpi).map(([k,v])=>`<div class="kpi-item"><div class="kpi-val">${v}</div><div class="kpi-key">${k}</div></div>`).join('')}</div>` : ''}
      ${fb.length ? `<div class="divider"></div><h4 style="margin-bottom:.75rem">Feedback</h4>
        ${fb.map(f=>`<div class="comment-card"><div class="comment-meta"><span>${f.fromName}</span><span>${f.date}</span></div><div class="comment-text">${f.text}</div></div>`).join('')}` : ''}
    </div>
  </div>`;
  panel.scrollIntoView({behavior:'smooth'});
}

// ── Feedback Page (TL) with pagination ────────
const FB_PER_PAGE = 5;
let fbPage = 1;

function renderFeedbackPage() {
  const teamIds = getDirectReportees(currentUser.id).map(e=>e.id);
  const allFb   = store.feedback.filter(f=>teamIds.includes(f.empId));
  const total   = allFb.length;
  const pages   = Math.ceil(total / FB_PER_PAGE);
  const slice   = allFb.slice().reverse().slice((fbPage-1)*FB_PER_PAGE, fbPage*FB_PER_PAGE);

  return `
  <div class="topbar"><div class="topbar-title"><h2>💬 Team Feedback</h2><p>${total} total feedback entries</p></div></div>
  <div class="page-content">
    <div id="modalArea"></div>
    ${total===0 ? `<div class="empty-state"><div class="empty-icon">💬</div><h3>No feedback yet</h3><p>Go to My Team and click "+ Feedback".</p></div>` :
    `<div class="card">
      <div class="card-body" style="padding:0">
        <div class="table-wrapper"><table>
          <thead><tr><th>Employee</th><th>Emp ID</th><th>Feedback</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>${slice.map(f=>`<tr>
            <td><strong>${f.empName}</strong></td>
            <td><span class="badge badge-gray">${f.empId}</span></td>
            <td style="max-width:800px">${f.text}</td>
            <td>${f.date}</td>
            <td><button class="btn btn-outline btn-sm" onclick="openFeedbackModal('${f.empId}','${f.empName.replace(/'/g,"\\'")}')">+ Add</button></td>
          </tr>`).join('')}</tbody>
        </table></div>
        ${pages>1?`<div class="pagination"><span class="page-info">Page ${fbPage} of ${pages}</span>
          ${fbPage>1?`<button class="btn btn-outline btn-sm" onclick="fbPage--;navigateTo('feedback')">← Prev</button>`:''}
          ${fbPage<pages?`<button class="btn btn-outline btn-sm" onclick="fbPage++;navigateTo('feedback')">Next →</button>`:''}
        </div>`:''}
      </div>
    </div>`}
  </div>`;
}

// ── Manager: Org View ─────────────────────────
function renderOrgPage() {
  const direct = getDirectReportees(currentUser.id);
  const resumes  = store.resumes;
  const billable = store.billable;

  return `
  <div class="topbar"><div class="topbar-title"><h2>🏢 My Teams</h2><p>Direct reports and their teams</p></div></div>
  <div class="page-content">
    <div class="stats-row">
      <div class="stat-card orange"><div class="stat-icon">👥</div><div class="stat-value">${direct.length}</div><div class="stat-label">Direct Reports</div></div>
      <div class="stat-card blue"><div class="stat-icon">🌳</div><div class="stat-value">${getAllSubordinates(currentUser.id).length}</div><div class="stat-label">Total Team</div></div>
      <div class="stat-card green"><div class="stat-icon">💰</div><div class="stat-value">${Object.values(billable).filter(v=>v).length}</div><div class="stat-label">Billable</div></div>
    </div>
    ${direct.map(lead=>{
      const leadTeam = getDirectReportees(lead.id);
      const hasR = !!resumes[lead.id];
      return `<div class="card" style="margin-bottom:1.5rem">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:.75rem">
            <div class="user-avatar" style="width:40px;height:40px;font-size:.875rem">${lead.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
            <div>
              <div style="font-weight:700">${lead.name} <span class="badge badge-gray">${lead.id}</span></div>
              <div style="font-size:.8rem;color:var(--text-muted)"><span class="badge badge-blue">Tech Lead</span>
                ${billable[lead.id]?'<span class="billable-pill yes" style="margin-left:.5rem">💰 Billable</span>':'<span class="billable-pill no" style="margin-left:.5rem">On Bench</span>'}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" onclick="showMgrEmpDetail('${lead.id}')">View Resume</button>
            <button class="btn btn-secondary btn-sm" onclick="openFeedbackModal('${lead.id}','${lead.name.replace(/'/g,"\\'")}')">+ Comment</button>
          </div>
        </div>
        ${leadTeam.length>0?`<div class="card-body" style="padding:2rem">
          <div class="table-wrapper"><table>
            <thead><tr><th>Emp ID</th><th>Name</th><th>Role</th><th>Billable</th><th>Resume</th><th>Action</th></tr></thead>
            <tbody>${leadTeam.map(e=>`<tr>
              <td><span class="badge badge-gray">${e.id}</span></td>
              <td>${e.name}</td>
              <td><span class="badge badge-${e.role==='techlead'?'blue':'green'}">${e.role==='techlead'?'TL':'Employee'}</span></td>
              <td>${billable[e.id]?'<span class="billable-pill yes">💰 Billable</span>':'<span class="billable-pill no">Bench</span>'}</td>
              <td>${resumes[e.id]?'<span class="badge badge-green">✓</span>':'<span class="badge badge-gray">—</span>'}</td>
              <td><button class="btn btn-outline btn-sm" onclick="showMgrEmpDetail('${e.id}')">View</button></td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>`:''}
      </div>`;
    }).join('')}
    <div id="empDetailPanel"></div>
    <div id="modalArea"></div>
  </div>`;
}

function showMgrEmpDetail(empId) {
  const emp = EMPLOYEES_DB[empId];
  const res = store.resumes[empId];
  const panel = document.getElementById('empDetailPanel');
  if (!panel) return;
  panel.innerHTML = `<div class="card" style="margin-top:1.5rem">
    <div class="card-header"><h3>👤 ${emp.name} (${emp.id})</h3>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('empDetailPanel').innerHTML=''">✕</button>
    </div>
    <div class="card-body">
      ${res ? renderParsedResume(res.parsed, emp.name) : '<div class="alert alert-info">No resume uploaded yet.</div>'}
      ${res ? `<div style="margin-top:1rem"><a class="btn btn-secondary btn-sm" href="${res.dataUrl}" download="${emp.name.replace(/ /g,'_')}.txt">⬇ Download Resume</a></div>` : ''}
    </div>
  </div>`;
  panel.scrollIntoView({behavior:'smooth'});
}

// ── Manager: Billable / Bench ─────────────────
function renderBillablePage() {
  const allSubs  = getAllSubordinates(currentUser.id);
  const billable = store.billable;
  const billList = allSubs.filter(e=>billable[e.id]===true);
  const benchList= allSubs.filter(e=>!billable[e.id]);

  return `
  <div class="topbar"><div class="topbar-title"><h2>💰 Billable / Bench Management</h2><p>Mark employees as billable or on bench</p></div></div>
  <div class="page-content">
    <div class="alert alert-info" style="margin-bottom:1.5rem">
      🔔 When you mark an employee as <strong>Billable</strong> and click Submit, they will receive a notification to upload their resume.
    </div>

    <!-- Billable Section -->
    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header" style="background:rgba(56,161,105,.05);border-left:4px solid var(--success)">
        <h3 style="color:var(--success)">💰 Billable Employees (${billList.length})</h3>
      </div>
      <div class="card-body" style="padding:0">
        ${billList.length===0
          ? '<div class="empty-state" style="padding:2rem"><div class="empty-icon" style="font-size:2rem">—</div><p>No employees marked billable yet.</p></div>'
          : `<div class="table-wrapper"><table>
            <thead><tr><th>Emp ID</th><th>Name</th><th>Resume</th><th>Action</th></tr></thead>
            <tbody>${billList.map(e=>`<tr>
              <td><span class="badge badge-gray">${e.id}</span></td>
              <td><strong>${e.name}</strong></td>
              <td>${store.resumes[e.id]?'<span class="badge badge-green">✓ Uploaded</span>':'<span class="badge badge-red">⚠ Missing</span>'}</td>
              <td><button class="btn btn-danger btn-sm" onclick="toggleBillable('${e.id}',false)">Remove from Billable</button></td>
            </tr>`).join('')}</tbody>
          </table></div>`}
      </div>
    </div>

    <!-- All employees table with add/remove -->
    <div class="card">
      <div class="card-header"><h3>All Team Members</h3>
        <div style="display:flex;gap:.5rem;align-items:center">
          <input id="billSearch" placeholder="Search…" oninput="filterBillTable()" style="padding:.4rem .75rem;border-radius:8px;border:1.5px solid var(--border);background:var(--surface);color:var(--text);font-size:.85rem;width:180px"/>
        </div>
      </div>
      <div class="card-body" style="padding:0">
        <div class="table-wrapper"><table id="billTable">
          <thead><tr><th>Emp ID</th><th>Name</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${allSubs.map(e=>`<tr class="bill-row" data-name="${e.name.toLowerCase()}">
            <td><span class="badge badge-gray">${e.id}</span></td>
            <td>${e.name}</td>
            <td><span class="badge badge-${e.role==='techlead'?'blue':'green'}">${e.role==='techlead'?'Tech Lead':'Employee'}</span></td>
            <td id="bill-status-${e.id}">${billable[e.id]
              ? '<span class="billable-pill yes">💰 Billable</span>'
              : '<span class="billable-pill no">On Bench</span>'}</td>
            <td id="bill-btn-${e.id}">
              ${billable[e.id]
                ? `<button class="btn btn-danger btn-sm" onclick="toggleBillable('${e.id}',false)">Remove</button>`
                : `<button class="btn btn-success btn-sm" onclick="toggleBillable('${e.id}',true)">+ Add Billable</button>`}
            </td>
          </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    </div>
    <div id="modalArea"></div>
  </div>`;
}

function filterBillTable() {
  const q = document.getElementById('billSearch').value.toLowerCase();
  document.querySelectorAll('.bill-row').forEach(r=>{
    r.style.display = r.dataset.name.includes(q) ? '' : 'none';
  });
}

function toggleBillable(empId, makeB) {
  const billable = store.billable;
  billable[empId] = makeB;
  store.saveBillable(billable);

  // Notify employee if being made billable
  if (makeB) {
    const hasR = !!store.resumes[empId];
    addNotif(empId, {
      icon:'🔔',
      title:'You have been added as Billable',
      message: hasR
        ? `Your Tech Lead ${currentUser.name} has marked you as billable. Your data is updated — you will be notified once a project is assigned.`
        : `Your Tech Lead ${currentUser.name} has marked you as billable. Please upload your resume immediately.`
    });
  }

  // Re-render page
  renderPage('billable');
}

// ── Manager: KPI Scoring ──────────────────────
function renderMgrKpiPage() {
  const allSubs = getAllSubordinates(currentUser.id);
  const kpiStore = store.kpi;
  const KPI_KEYS = ['Performance Rating','Goal Completion','Attendance','Training Credits','Communication','Technical Skills'];

  return `
  <div class="topbar"><div class="topbar-title"><h2>📊 KPI Scores</h2><p>Set and update KPI for your reportees</p></div></div>
  <div class="page-content">
    <div class="alert alert-info" style="margin-bottom:1.5rem">Click on any score field to edit. Press Save after updating.</div>
    <div class="form-group" style="max-width:300px;margin-bottom:1.5rem">
      <label>Select Employee</label>
      <select id="kpiEmpSelect" onchange="renderKpiEditor()">
        <option value="">— Choose employee —</option>
        ${allSubs.map(e=>`<option value="${e.id}">${e.name} (${e.id})</option>`).join('')}
      </select>
    </div>
    <div id="kpiEditorArea"></div>
  </div>`;
}

function renderKpiEditor() {
  const empId = document.getElementById('kpiEmpSelect').value;
  const area  = document.getElementById('kpiEditorArea');
  if (!empId) { area.innerHTML=''; return; }
  const emp   = EMPLOYEES_DB[empId];
  const kpiStore = store.kpi;
  const kpi   = kpiStore[empId] || {};
  const KPI_KEYS = ['Performance Rating','Goal Completion','Attendance','Training Credits','Communication','Technical Skills'];

  area.innerHTML = `
  <div class="card">
    <div class="card-header"><h3>KPI for ${emp.name} (${emp.id})</h3></div>
    <div class="card-body">
      <div class="kpi-grid" style="margin-bottom:1.5rem">
        ${KPI_KEYS.map(k=>`<div class="kpi-item">
          <input class="kpi-input" id="kpi_${k.replace(/ /g,'_')}" value="${kpi[k]||''}" placeholder="—" title="${k}"/>
          <div class="kpi-key">${k}</div>
        </div>`).join('')}
      </div>
      <div class="form-group">
        <label>Note / Comment (optional)</label>
        <textarea id="kpiNote" rows="2" placeholder="Add a note about this rating...">${kpi._note||''}</textarea>
      </div>
      <button class="btn btn-primary" onclick="saveKpi('${empId}')">💾 Save KPI Scores</button>
    </div>
  </div>`;
}

function saveKpi(empId) {
  const KPI_KEYS = ['Performance Rating','Goal Completion','Attendance','Training Credits','Communication','Technical Skills'];
  const kpiStore = store.kpi;
  if (!kpiStore[empId]) kpiStore[empId] = {};
  KPI_KEYS.forEach(k=>{
    const val = document.getElementById(`kpi_${k.replace(/ /g,'_')}`)?.value.trim();
    if (val) kpiStore[empId][k] = val;
  });
  kpiStore[empId]._note = document.getElementById('kpiNote')?.value.trim();
  store.saveKpi(kpiStore);
  // Notify employee
  addNotif(empId, { icon:'📊', title:'KPI Updated', message:`Your manager has updated your KPI scores. Check your KPI page for details.` });
  alert(`KPI saved for ${EMPLOYEES_DB[empId].name}!`);
}

// ── Manager: Comments ─────────────────────────
function renderMgrComments() {
  const direct = getDirectReportees(currentUser.id);
  const myComments = store.feedback.filter(f=>f.fromId===currentUser.id);

  return `
  <div class="topbar"><div class="topbar-title"><h2>💬 Manager Comments</h2><p>Add comments on your reportees</p></div></div>
  <div class="page-content">
    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header"><h3>Add Comment</h3></div>
      <div class="card-body">
        <div class="form-group"><label>Select Employee</label>
          <select id="commentEmpId">
            <option value="">— Choose —</option>
            ${direct.map(e=>`<option value="${e.id}">${e.name} (${e.id})</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Comment</label>
          <textarea id="managerComment" rows="3" placeholder="Performance comment..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="submitMgrComment()">Submit Comment</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>My Comments (${myComments.length})</h3></div>
      <div class="card-body">
        ${myComments.length===0 ? '<p class="text-muted">No comments yet.</p>' :
        myComments.slice().reverse().map(f=>`<div class="comment-card">
          <div class="comment-meta"><span>To: ${f.empName} (${f.empId})</span><span>${f.date}</span></div>
          <div class="comment-text">${f.text}</div>
        </div>`).join('')}
      </div>
    </div>
    <div id="modalArea"></div>
  </div>`;
}

function submitMgrComment() {
  const empId = document.getElementById('commentEmpId').value;
  const text  = document.getElementById('managerComment').value.trim();
  if (!empId) return alert('Select an employee.');
  if (!text)  return alert('Write a comment.');
  const emp = EMPLOYEES_DB[empId];
  const feedback = store.feedback;
  feedback.push({ id:Date.now(), empId, empName:emp.name, fromId:currentUser.id, fromName:currentUser.name, fromRole:'Manager', text, date:new Date().toLocaleDateString() });
  store.saveFeedback(feedback);
  addNotif(empId, { icon:'💬', title:'New Manager Comment', message:`${currentUser.name} has added a comment on your profile.` });
  renderPage('mgr-comments');
}

// ── Manager: Helpdesk (VIEW ONLY) ────────────
let hdPage = 1;
const HD_PER_PAGE = 10;

function renderMgrHelpdesk() {
  const issues = store.issues;
  const total  = issues.length;
  const pages  = Math.ceil(total / HD_PER_PAGE);
  const slice  = issues.slice().reverse().slice((hdPage-1)*HD_PER_PAGE, hdPage*HD_PER_PAGE);
  const open   = issues.filter(i=>i.status==='Open').length;
  const resolved=issues.filter(i=>i.status==='Resolved').length;

  return `
  <div class="topbar"><div class="topbar-title"><h2>🎫 Helpdesk (View Only)</h2><p>You can view tickets but cannot take action</p></div></div>
  <div class="page-content">
    <div class="alert alert-warning" style="margin-bottom:1.5rem">👁 Manager access is view-only. Ticket resolution is handled by the IT/HR Support Team.</div>
    <div class="stats-row">
      <div class="stat-card orange"><div class="stat-icon">🔴</div><div class="stat-value">${open}</div><div class="stat-label">Open</div></div>
      <div class="stat-card green"><div class="stat-icon">✅</div><div class="stat-value">${resolved}</div><div class="stat-label">Resolved</div></div>
      <div class="stat-card blue"><div class="stat-icon">📋</div><div class="stat-value">${total}</div><div class="stat-label">Total</div></div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:0">
        ${total===0 ? '<div class="empty-state"><div class="empty-icon">🎉</div><h3>No tickets</h3></div>' :
        `<div class="table-wrapper"><table>
          <thead><tr><th>Ticket</th><th>Emp ID</th><th>Name</th><th>Category</th><th>Issue</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>${slice.map(i=>`<tr>
            <td><strong>#${String(i.id).slice(-4)}</strong></td>
            <td><span class="badge badge-gray">${i.empId}</span></td>
            <td>${i.empName}</td>
            <td><span class="badge badge-blue">${i.category}</span></td>
            <td style="max-width:240px;word-break:break-word">${i.text}</td>
            <td>${i.date}</td>
            <td><span class="badge badge-${i.status==='Open'?'orange':'green'}">${i.status}</span></td>
          </tr>`).join('')}</tbody>
        </table></div>
        ${pages>1?`<div class="pagination"><span class="page-info">Page ${hdPage} of ${pages}</span>
          ${hdPage>1?`<button class="btn btn-outline btn-sm" onclick="hdPage--;navigateTo('mgr-helpdesk')">← Prev</button>`:''}
          ${hdPage<pages?`<button class="btn btn-outline btn-sm" onclick="hdPage++;navigateTo('mgr-helpdesk')">Next →</button>`:''}
        </div>`:''}`}
      </div>
    </div>
  </div>`;
}

// ── Feedback Modal (shared) ───────────────────
function openFeedbackModal(empId, empName) {
  const area = document.getElementById('modalArea');
  if (!area) return;
  area.innerHTML = `<div class="modal-overlay" onclick="closeFbModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header"><h3>💬 Feedback for ${empName}</h3>
        <button class="btn btn-ghost" onclick="document.getElementById('modalArea').innerHTML=''">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label>Your Feedback</label>
          <textarea id="feedbackText" rows="4" placeholder="Write constructive feedback..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('modalArea').innerHTML=''">Cancel</button>
        <button class="btn btn-primary" onclick="submitFeedback('${empId}','${empName.replace(/'/g,"\\'")}')">Submit</button>
      </div>
    </div>
  </div>`;
}

function closeFbModal(e) { if(e.target.classList.contains('modal-overlay')) document.getElementById('modalArea').innerHTML=''; }

function submitFeedback(empId, empName) {
  const text = document.getElementById('feedbackText').value.trim();
  if (!text) return alert('Please enter feedback.');
  const feedback = store.feedback;
  feedback.push({ id:Date.now(), empId, empName, fromId:currentUser.id, fromName:currentUser.name,
    fromRole:{employee:'Employee',techlead:'Tech Lead',manager:'Manager'}[currentUser.role],
    text, date:new Date().toLocaleDateString() });
  store.saveFeedback(feedback);
  addNotif(empId, { icon:'💬', title:'New Feedback', message:`${currentUser.name} has added feedback on your profile.` });
  document.getElementById('modalArea').innerHTML='';
  alert('Feedback submitted!');
}

// ── Utils ─────────────────────────────────────
function showAlert(id, msg, type='error') {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="alert alert-${type}">⚠ ${msg}</div>`;
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('tsl_theme', next);
}

// ── Bootstrap ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const theme = localStorage.getItem('tsl_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);

  const session = localStorage.getItem('tsl_session');
  if (session) {
    try {
      const saved = JSON.parse(session);
      currentUser = EMPLOYEES_DB[saved.id] || saved;
      renderApp(); return;
    } catch(e) {}
  }
  renderAuth();
});
