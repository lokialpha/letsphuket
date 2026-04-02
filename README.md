# 🌴 LetsPhuket — Phuket Cannabis Shop & Content Hub

🌐 **Live Website:** https://letsphuket.site  
🌿 **Current Focus:** Cannabis Strain Showcase & Shop Info  
🧭 **Future Scope:** Travel Guides, Local Lifestyle & Cannabis Content

A content-first website built to **showcase cannabis strains** available in a Phuket-based shop, with a long-term plan to expand into **Phuket travel, local guides, and cannabis culture content**.

---

## ✨ About This Project

**LetsPhuket** currently serves as a **digital presentation for a cannabis shop**, designed to:

- Display **Cannabis strain information**
- Present products in a clean, visual layout
- Share structured details about available items
- Build a foundation for **expanded content** on travel and local culture

This project focuses on **quality content and structure first**, then future automated and SEO content strategies.

---

## 🍃 Current Features

- 🌱 Strain showcase (names, visuals, categories)
- 🏪 Clean cannabis product pages
- 📱 Responsive UI
- ⚡ Lightweight performance
- 🌍 Deployed live with custom domain
- 🗄️ Supabase-backed dynamic content for strains, merch, and visit info

---

## 🛠 Tech Stack

- **HTML**
- **CSS**
- **JavaScript**
- **Supabase (Postgres + RLS)**
- Hosted with **GitHub Pages**

---

## 📂 Project Structure

```text
.
├── index.html              # Client home page
├── client/
│   ├── pages/
│   │   ├── strains.html    # Client all strains page
│   │   └── strain.html     # Client strain detail page
│   └── assets/
│       ├── css/
│       │   ├── styles.css  # Shared client styles
│       │   ├── strain.css  # Strain detail page styles
│       │   └── strains.css # All strains page styles
│       └── js/
│           ├── script.js   # Home page behavior + Supabase rendering
│           ├── strain.js   # Strain detail page behavior
│           └── strains.js  # All strains page behavior + load more UX
├── supabase-config.js      # Frontend Supabase connection config
├── supabase/
│   ├── schema.sql          # Tables, policies, seed data
│   └── README.md           # Supabase setup steps
├── image/                  # Image assets
└── README.md
```

## ⚙️ Supabase Setup

1. Open Supabase SQL Editor and run `supabase/schema.sql`.
2. Set `url` and `anonKey` in `supabase-config.js`.
3. Optional admin editing: add your `auth.users.id` to `public.admin_users`.

Detailed steps: [`supabase/README.md`](supabase/README.md)

## 🔐 Admin Page

- Route: `/admin/` (local: `http://127.0.0.1:4173/admin/`)
- Login uses Supabase email/password auth.
- Access is restricted to users listed in `public.admin_users`.
- Current scope: strains CRUD (`create`, `edit`, `publish/unpublish`, `delete`, `sort_order`, `featured`).

## 🌐 Live Preview

👉 Visit the live site here:  
**https://letsphuket.site**

---

## 📬 Contact

If you’d like to discuss this project or collaborate:

- 📧 **Email:** alphavat.mm@gmail.com
- 🌍 **Portfolio:** https://lokialpha.site
- 🐙 **GitHub:** https://github.com/lokialpha
