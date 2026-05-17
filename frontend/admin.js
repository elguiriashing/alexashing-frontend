const API_URL = 'https://sublime-enthusiasm-production-a6c8.up.railway.app/api';
let authToken = localStorage.getItem('adminToken') || '';

// --- Login Logic ---
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('login-password').value;
  // Test authentication by fetching messages
  fetch(`${API_URL}/messages`, { headers: { 'Authorization': pwd } })
    .then(res => {
      if (res.ok) {
        authToken = pwd;
        localStorage.setItem('adminToken', authToken);
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('dashboard-app').classList.remove('hidden');
        initDashboard();
      } else {
        document.getElementById('login-error').classList.remove('hidden');
      }
    })
    .catch(err => {
      console.error(err);
      document.getElementById('login-error').innerText = "Network Error";
      document.getElementById('login-error').classList.remove('hidden');
    });
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  authToken = '';
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('dashboard-app').classList.add('hidden');
});

// Auto-login check on load
if (authToken) {
  fetch(`${API_URL}/messages`, { headers: { 'Authorization': authToken } })
    .then(res => {
      if (res.ok) {
        document.getElementById('login-overlay').classList.add('hidden');
        document.getElementById('dashboard-app').classList.remove('hidden');
        initDashboard();
      } else {
        localStorage.removeItem('adminToken');
      }
    });
}

// --- Navigation Logic ---
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    if (e.target.id === 'logout-btn') return;
    
    // Update active button
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');

    // Update active view
    const targetId = e.target.getAttribute('data-target');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');

    // Refresh data if needed
    if (targetId === 'dashboard') loadDashboardData();
    if (targetId === 'messages') loadMessages();
    if (targetId === 'leads') loadLeads();
  });
});

function initDashboard() {
  loadDashboardData();
  loadMessages();
  loadLeads();
}

// --- Dashboard Logic ---
let messagesChartInstance = null;
let eventsChartInstance = null;
let portfolioChartInstance = null;

async function fetchWithAuth(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': authToken, ...options.headers };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok && response.status === 401) {
    document.getElementById('logout-btn').click();
    throw new Error('Unauthorized');
  }
  return response;
}

async function loadDashboardData() {
  try {
    const [msgsRes, evtsRes, portRes, leadsRes] = await Promise.all([
      fetchWithAuth(`${API_URL}/messages`),
      fetchWithAuth(`${API_URL}/events`),
      fetchWithAuth(`${API_URL}/portfolio`),
      fetchWithAuth(`${API_URL}/leads`)
    ]);
    
    const messages = await msgsRes.json();
    const events = await evtsRes.json();
    const portfolio = await portRes.json();
    const leads = await leadsRes.json();
    
    document.getElementById('total-messages-count').innerText = messages.length;
    document.getElementById('pending-messages-count').innerText = messages.filter(m => m.status === 'new').length;
    document.getElementById('total-events-count').innerText = events.length;
    document.getElementById('total-leads-count').innerText = leads.length;

    renderMessagesChart(messages);
    renderEventsChart(events);
    renderPortfolioChart(portfolio);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  }
}

function renderMessagesChart(messages) {
  const ctx = document.getElementById('messagesChart').getContext('2d');
  if (messagesChartInstance) messagesChartInstance.destroy();

  const dateCounts = {};
  messages.forEach(m => {
    const date = new Date(m.createdAt).toLocaleDateString();
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  });

  const labels = Object.keys(dateCounts).slice(0, 7).reverse();
  const data = Object.values(dateCounts).slice(0, 7).reverse();

  messagesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Messages',
        data: data,
        borderColor: '#ff3366',
        backgroundColor: 'rgba(255, 51, 102, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: '#222' } },
        x: { ticks: { color: '#888' }, grid: { color: '#222' } }
      }
    }
  });
}

function renderEventsChart(events) {
  const ctx = document.getElementById('eventsChart').getContext('2d');
  if (eventsChartInstance) eventsChartInstance.destroy();

  const statuses = { 'pending': 0, 'confirmed': 0, 'cancelled': 0 };
  events.forEach(e => { statuses[e.status] = (statuses[e.status] || 0) + 1; });

  eventsChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statuses),
      datasets: [{
        data: Object.values(statuses),
        backgroundColor: ['#ffc107', '#33ff66', '#ff3333'],
        borderColor: '#111',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#f0f0f0' } } }
    }
  });
}

function renderPortfolioChart(portfolio) {
  const ctx = document.getElementById('portfolioChart').getContext('2d');
  if (portfolioChartInstance) portfolioChartInstance.destroy();

  const categories = {};
  portfolio.forEach(p => {
    const cat = p.category || p.type || 'Uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  portfolioChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        label: 'Items',
        data: Object.values(categories),
        backgroundColor: '#ff3366',
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#888' }, grid: { color: '#222' } },
        x: { ticks: { color: '#888' }, grid: { color: '#222' } }
      }
    }
  });
}

// --- Messages / CRM Logic ---
async function loadMessages() {
  try {
    const res = await fetchWithAuth(`${API_URL}/messages`);
    const messages = await res.json();
    
    const tbody = document.querySelector('#messages-table tbody');
    tbody.innerHTML = '';

    messages.forEach(msg => {
      const tr = document.createElement('tr');
      const date = new Date(msg.createdAt).toLocaleDateString();
      
      tr.innerHTML = `
        <td>${date}</td>
        <td>${msg.name}</td>
        <td><a href="#" onclick="openEmailModal('${msg.email}'); return false;" style="color:var(--accent);">${msg.email}</a></td>
        <td>${msg.project_type || 'General'}</td>
        <td><span class="status-badge status-${msg.status}">${msg.status}</span></td>
        <td>
          <button class="action-btn primary" onclick="updateMessageStatus('${msg._id}', 'responded')">✓</button>
          <button class="action-btn" onclick="updateMessageStatus('${msg._id}', 'archived')">Archive</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}

async function updateMessageStatus(id, status) {
  try {
    await fetchWithAuth(`${API_URL}/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    loadMessages();
    loadDashboardData();
  } catch (error) {
    console.error("Error updating status:", error);
  }
}

// --- Leads CRM Logic ---
let allLeads = [];

async function loadLeads() {
  try {
    const res = await fetchWithAuth(`${API_URL}/leads`);
    allLeads = await res.json();
    
    // Populate Email Direct Contacts Dropdown
    const emailSelect = document.getElementById('email-contact-select');
    if (emailSelect) {
      emailSelect.innerHTML = '<option value="">-- Choose a contact --</option>';
      allLeads.forEach(lead => {
        if (lead.emails && lead.emails.length > 0) {
          emailSelect.innerHTML += `<option value="${lead.emails[0]}">${lead.businessName} (${lead.emails[0]})</option>`;
        }
      });
    }

    renderLeads(allLeads);
  } catch (error) {
    console.error("Error loading leads:", error);
  }
}

function filterLeads(status) {
  if (status === 'all') {
    renderLeads(allLeads);
  } else {
    renderLeads(allLeads.filter(l => l.status === status));
  }
}

function renderLeads(leads) {
  const tbody = document.querySelector('#leads-table tbody');
  tbody.innerHTML = '';

  leads.forEach(lead => {
    const tr = document.createElement('tr');
    const websiteLink = lead.website ? `<a href="${lead.website}" target="_blank" style="color:var(--text-main)">Visit</a>` : '-';
    const firstEmail = lead.emails && lead.emails.length > 0 ? lead.emails[0] : '-';
    const firstPhone = lead.phones && lead.phones.length > 0 ? lead.phones[0] : '-';
    
    const socialsList = lead.socials && lead.socials.length > 0 
      ? lead.socials.map(s => `<a href="${s}" target="_blank">🔗</a>`).join(' ') 
      : '-';

    let emailAction = '-';
    if (firstEmail !== '-') {
      emailAction = `<a href="#" onclick="openEmailModal('${firstEmail}'); return false;" style="color:var(--accent);">${firstEmail}</a>`;
    }

    tr.innerHTML = `
      <td>${lead.businessName}</td>
      <td>${lead.location || '-'}</td>
      <td>${websiteLink}</td>
      <td>${emailAction}</td>
      <td>${firstPhone}</td>
      <td>${socialsList}</td>
      <td>
        <select onchange="updateLeadStatus('${lead._id}', this.value)" style="padding:4px; background:transparent; color:#fff; border:1px solid #444; border-radius:4px;">
          <option value="scraped" ${lead.status === 'scraped' ? 'selected' : ''}>Uncontacted</option>
          <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
          <option value="client" ${lead.status === 'client' ? 'selected' : ''}>Client</option>
          <option value="closed" ${lead.status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
      </td>
      <td>
        <button class="action-btn" onclick="deleteLead('${lead._id}')">Del</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function updateLeadStatus(id, status) {
  try {
    await fetchWithAuth(`${API_URL}/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    loadLeads();
  } catch (error) {
    console.error("Error updating lead status:", error);
  }
}

async function deleteLead(id) {
  if (!confirm('Are you sure you want to delete this lead?')) return;
  try {
    await fetchWithAuth(`${API_URL}/leads/${id}`, { method: 'DELETE' });
    loadLeads();
    loadDashboardData();
  } catch (error) {
    console.error("Error deleting lead:", error);
  }
}

async function saveLead(leadData) {
  try {
    const res = await fetchWithAuth(`${API_URL}/leads`, {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
    const json = await res.json();
    if (json._id) {
      alert(`Saved ${leadData.businessName} to Leads Database!`);
      loadLeads();
      loadDashboardData();
    }
  } catch (error) {
    console.error("Error saving lead:", error);
    alert('Failed to save lead.');
  }
}

// --- Email Logic ---
function openEmailModal(email) {
  document.querySelector('.nav-btn[data-target="email"]').click();
  document.getElementById('email-to').value = email;
}

document.getElementById('email-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const to = document.getElementById('email-to').value;
  const subject = document.getElementById('email-subject').value;
  const text = document.getElementById('email-body').value;
  const btn = document.getElementById('email-btn');
  const statusDiv = document.getElementById('email-status');
  
  btn.disabled = true;
  statusDiv.innerText = 'Sending email...';
  statusDiv.style.color = '#fff';

  try {
    const res = await fetchWithAuth(`${API_URL}/email/send`, {
      method: 'POST',
      body: JSON.stringify({ to, subject, text })
    });
    
    const json = await res.json();
    if (json.success) {
      statusDiv.innerText = 'Email sent successfully!';
      statusDiv.style.color = '#33ff66';
      document.getElementById('email-subject').value = '';
      document.getElementById('email-body').value = '';
    } else {
      statusDiv.innerText = json.error || 'Failed to send email';
      statusDiv.style.color = '#ff3333';
    }
  } catch (error) {
    statusDiv.innerText = 'Network error while sending email';
    statusDiv.style.color = '#ff3333';
  } finally {
    btn.disabled = false;
  }
});

// --- Outreach Business Search Logic (OSM) ---
document.getElementById('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const type = document.getElementById('search-type').value;
  const location = document.getElementById('search-location').value;
  const loader = document.getElementById('search-loader');
  const resultsDiv = document.getElementById('search-results-container');
  const tbody = document.querySelector('#search-results-table tbody');
  const btn = document.getElementById('search-btn');
  
  loader.classList.remove('hidden');
  resultsDiv.classList.add('hidden');
  tbody.innerHTML = '';
  btn.disabled = true;

  try {
    const res = await fetchWithAuth(`${API_URL}/outreach/search`, {
      method: 'POST',
      body: JSON.stringify({ type, location })
    });
    
    const json = await res.json();
    
    if (json.success && json.data) {
      document.getElementById('search-count').innerText = json.data.length;
      
      json.data.forEach((biz, index) => {
        const tr = document.createElement('tr');
        
        let websiteHTML = '-';
        let websiteInput = '';
        if (biz.website) {
          websiteHTML = `<a href="${biz.website}" target="_blank" style="color:var(--text-main)">Link</a>`;
        } else {
          websiteInput = `<input type="text" placeholder="Enter website URL" id="website-input-${index}" style="width:150px; padding:4px; background:#222; color:#fff; border:1px solid #444; border-radius:4px; font-size:12px;">`;
        }

        const leadDataStr = encodeURIComponent(JSON.stringify({
          businessName: biz.name,
          website: biz.website,
          phones: biz.phone ? [biz.phone] : [],
          location: biz.address || location
        }));

        const scrapeAction = biz.website 
          ? `<button class="action-btn" onclick="triggerScrape('${biz.website}', '${biz.name.replace(/'/g, "\\'")}', '${(biz.address || location).replace(/'/g, "\\'")}')">Deep Scrape</button>`
          : `<button class="action-btn" onclick="triggerScrapeWithInput(${index}, '${biz.name.replace(/'/g, "\\'")}', '${(biz.address || location).replace(/'/g, "\\'")}')">Deep Scrape</button>`;

        const findWebsiteBtn = !biz.website 
          ? `<button class="action-btn" style="background:#6366f1;" onclick="findWebsite(${index}, '${biz.name.replace(/'/g, "\\'")}', '${(biz.address || location).replace(/'/g, "\\'")}')">Find Website</button>`
          : '';

        tr.innerHTML = `
          <td>${biz.name}</td>
          <td>${biz.type}</td>
          <td>${websiteHTML} ${websiteInput}</td>
          <td>${biz.phone || '-'}</td>
          <td style="display:flex; gap:5px; flex-wrap:wrap;">
            ${findWebsiteBtn}
            ${scrapeAction}
            <button class="action-btn primary" onclick="saveLeadWithWebsite(${index}, JSON.parse(decodeURIComponent('${leadDataStr}')))">+ CRM</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      
      resultsDiv.classList.remove('hidden');
    } else {
      alert(json.error || 'Search failed');
    }
  } catch (error) {
    console.error("Search error:", error);
    alert('An error occurred while searching. Ensure the backend is running.');
  } finally {
    loader.classList.add('hidden');
    btn.disabled = false;
  }
});

// Helper to bridge Search results to Deep Scraper
function triggerScrape(url, name, address) {
  document.getElementById('scrape-url').value = url;
  document.getElementById('scrape-form').dispatchEvent(new Event('submit'));
  // Store the name and location temporarily so we can save it to CRM later
  window.lastScrapedBusinessName = name;
  window.lastScrapedLocation = address;
}

// Helper for manual website input deepscrape
function triggerScrapeWithInput(index, name, address) {
  const input = document.getElementById(`website-input-${index}`);
  const url = input.value.trim();
  if (!url) {
    alert('Please enter a website URL first');
    return;
  }
  triggerScrape(url, name, address);
}

// Helper to find website using search
async function findWebsite(index, name, address) {
  try {
    const res = await fetchWithAuth(`${API_URL}/outreach/find-website`, {
      method: 'POST',
      body: JSON.stringify({ businessName: name, location: address })
    });
    
    const json = await res.json();
    if (json.success && json.data.websites && json.data.websites.length > 0) {
      // Show websites in a prompt for user to select
      const websites = json.data.websites;
      let message = `Found ${websites.length} potential websites for "${name}":\n\n`;
      websites.forEach((w, i) => {
        message += `${i + 1}. ${w.title}\n   ${w.url}\n\n`;
      });
      message += 'Enter the number of the website to use, or click Cancel to skip:';
      
      const selection = prompt(message);
      if (selection && !isNaN(selection)) {
        const selectedIndex = parseInt(selection) - 1;
        if (selectedIndex >= 0 && selectedIndex < websites.length) {
          const selectedUrl = websites[selectedIndex].url;
          const input = document.getElementById(`website-input-${index}`);
          if (input) {
            input.value = selectedUrl;
          }
          // Auto-trigger scrape after selection
          triggerScrape(selectedUrl, name, address);
        }
      }
    } else {
      alert('No websites found for this business. Try entering a website manually.');
    }
  } catch (error) {
    console.error('Find website error:', error);
    alert('Failed to search for website. Please try entering it manually.');
  }
}

// Helper to save lead with manually entered website
function saveLeadWithWebsite(index, leadData) {
  const input = document.getElementById(`website-input-${index}`);
  if (input && input.value.trim()) {
    leadData.website = input.value.trim();
  }
  saveLead(leadData);
}

// --- Outreach Deep Scraping Logic ---
let lastScrapedData = null;

document.getElementById('scrape-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const url = document.getElementById('scrape-url').value;
  const loader = document.getElementById('scrape-loader');
  const resultsDiv = document.getElementById('scrape-results');
  const btn = document.getElementById('scrape-btn');
  
  loader.classList.remove('hidden');
  resultsDiv.classList.add('hidden');
  btn.disabled = true;
  lastScrapedData = null;

  try {
    const res = await fetchWithAuth(`${API_URL}/outreach/scrape`, {
      method: 'POST',
      body: JSON.stringify({ url })
    });
    
    const json = await res.json();
    
    if (json.success) {
      const data = json.data;
      lastScrapedData = data; // Save for CRM import
      
      document.getElementById('res-url').innerHTML = `<a href="${data.url}" target="_blank" style="color:var(--text-main)">${data.url}</a>`;
      document.getElementById('res-title').innerText = data.title;
      
      document.getElementById('res-emails').innerHTML = data.emails.length 
        ? data.emails.map(e => `<li><a href="#" onclick="openEmailModal('${e}'); return false;">${e}</a></li>`).join('') 
        : '<li style="color:var(--text-muted)">No emails found</li>';
        
      document.getElementById('res-phones').innerHTML = data.phones.length 
        ? data.phones.map(p => `<li>${p}</li>`).join('') 
        : '<li style="color:var(--text-muted)">No phones found</li>';
        
      document.getElementById('res-socials').innerHTML = data.socials.length 
        ? data.socials.map(s => `<li><a href="${s}" target="_blank" style="color:var(--text-main)">${new URL(s).hostname}</a></li>`).join('') 
        : '<li style="color:var(--text-muted)">No social links found</li>';
        
      resultsDiv.classList.remove('hidden');
    } else {
      alert(json.error || 'Scraping failed');
    }
  } catch (error) {
    console.error("Scraping error:", error);
    alert('An error occurred while scraping. Ensure the backend is running.');
  } finally {
    loader.classList.add('hidden');
    btn.disabled = false;
  }
});

document.getElementById('save-scraped-lead-btn').addEventListener('click', () => {
  if (!lastScrapedData) return;
  
  const leadData = {
    businessName: window.lastScrapedBusinessName || lastScrapedData.title || new URL(lastScrapedData.url).hostname,
    website: lastScrapedData.url,
    emails: lastScrapedData.emails,
    phones: lastScrapedData.phones,
    socials: lastScrapedData.socials,
    location: window.lastScrapedLocation || ''
  };
  
  saveLead(leadData);
});
