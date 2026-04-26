# Tessolve Resume Parser Portal

## 🚀 Run in VS Code

1. Unzip → open `tessolve-hr/` folder in VS Code
2. Install **Live Server** extension (by Ritwick Dey)
3. Right-click `index.html` → **Open with Live Server**
4. App opens at `http://127.0.0.1:5500`
5. **Support team helpdesk:** `http://127.0.0.1:5500/helpdesk.html`

---
  
## 🔐 Login Credentials

### Manager (L2)
| Name | Emp ID | Password |
|------|--------|----------|
| Parthiban Pavadai Balan | 10191 | 10191 |

### Tech Leads (L1) — Sample
| Name | Emp ID | Password |
|------|--------|----------|
| Deepak Nagaraju | 10100 | 10100 |
| Mani Athankarayan | 12633 | 12633 |


### Employees — Sample
| Name | Emp ID | Password |
|------|--------|----------|
| Yun-Cheng Zhang | 5310 | 5310 |


> **Password pattern:** `FirstName@123` (check `data/employees.js` for all)

---

## ✅ Changes in v2

| # | Change | Status |
|---|--------|--------|
| 1 | Manager Helpdesk = View Only (no resolve buttons) | ✅ |
| 2 | Helpdesk pagination + filters (status, category, search) | ✅ |
| 3 | Feedback section pagination | ✅ |
| 4 | Manager KPI Scoring for reportees | ✅ |
| 5 | Billable / Bench management with Submit | ✅ |
| 6 | Employee notifications when marked billable | ✅ |
| 7 | Employee dashboard shows billable status alert | ✅ |
| 8 | All 350 employees from Book_7.xlsx | ✅ |

---

## 👥 Role Matrix

| Feature | Employee | Tech Lead | Manager |
|---------|----------|-----------|---------|
| Upload resume | ✅ | ✅ | ❌ |
| View KPI | ✅ | ✅ | — |
| Edit KPI | ❌ | ❌ | ✅ |
| Raise helpdesk ticket | ✅ | — | — |
| View helpdesk | — | — | ✅ (view only) |
| Resolve tickets | — | — | ❌ |
| View team | — | ✅ | ✅ |
| Mark billable | — | — | ✅ |
| Give feedback/comments | — | ✅ | ✅ |
| Receive notifications | ✅ | ✅ | — |

## 📁 Files
```
tessolve-hr/
├── index.html       ← Main app
├── helpdesk.html    ← Support team only
├── logo.jpg
├── css/style.css
├── js/app.js
└── data/employees.js  ← 350 employees from Excel
```
