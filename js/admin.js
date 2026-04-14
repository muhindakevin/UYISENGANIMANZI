let token = "";
let role = "";
let dataCache = null;
let identityPhotoData = "";
let teamPhotoData = "";

async function api(path, method = "GET", body) {
  try {
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    return response.json();
  } catch (error) {
    if (window.location.protocol === "file:") {
      throw new Error("Open admin via http://localhost:3000/admin.html (not file://).");
    }
    throw new Error("Cannot reach backend. Start server with: npm install, then npm start.");
  }
}

function qs(id) {
  return document.getElementById(id);
}

function setStatus(message, type = "ok") {
  const banner = qs("statusBanner");
  banner.textContent = message;
  banner.className = `status-banner show ${type}`;
}

function clearStatus() {
  qs("statusBanner").className = "status-banner";
  qs("statusBanner").textContent = "";
}

function adminOnlyGuard() {
  if (role !== "admin") {
    setStatus("Only admin can do this action.", "error");
    throw new Error("Forbidden");
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleImageInput(fileInputId, previewId, targetKey) {
  const input = qs(fileInputId);
  const preview = qs(previewId);
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("Please choose a valid image file.", "error");
    input.value = "";
    return;
  }
  const base64 = await fileToBase64(file);
  if (targetKey === "identity") identityPhotoData = base64;
  if (targetKey === "team") teamPhotoData = base64;
  preview.src = base64;
  preview.classList.add("show");
}

function setPreview(previewId, src) {
  const preview = qs(previewId);
  if (src) {
    preview.src = src;
    preview.classList.add("show");
  } else {
    preview.removeAttribute("src");
    preview.classList.remove("show");
  }
}

function renderPrograms() {
  const list = qs("programList");
  list.innerHTML = (dataCache.programs || []).map((p) => `
    <article class="list-item no-photo">
      <div>
        <div class="meta-title">${p.name}</div>
        <div class="meta-sub"><span class="pill">${p.id}</span></div>
        <div class="meta-text">${p.description || ""}</div>
      </div>
      <button class="btn btn-danger" onclick="deleteProgram('${p.id}')">Delete</button>
    </article>
  `).join("");

  qs("newsProgram").innerHTML = (dataCache.programs || [])
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("");
}

function renderNews() {
  const list = qs("newsListAdmin");
  const programMap = Object.fromEntries((dataCache.programs || []).map((p) => [p.id, p.name]));
  list.innerHTML = (dataCache.news || []).map((n) => `
    <article class="list-item no-photo">
      <div>
        <div class="meta-title">${n.title}</div>
        <div class="meta-sub"><span class="pill">${programMap[n.programId] || "General"}</span> ${n.date || ""}</div>
        <div class="meta-text">${n.content || ""}</div>
      </div>
      <button class="btn btn-danger" onclick="deleteNews('${n.id}')">Delete</button>
    </article>
  `).join("");
}

function renderTeam() {
  const list = qs("teamListAdmin");
  list.innerHTML = (dataCache.teamMembers || []).map((m) => `
    <article class="list-item ${m.photo ? "" : "no-photo"}">
      ${m.photo ? `<img class="thumb" src="${m.photo}" alt="${m.name || "Member"}">` : ""}
      <div>
        <div class="meta-title">${m.name || "Unnamed Member"}</div>
        <div class="meta-sub">${m.title || ""}</div>
        <div class="meta-text">${m.contact || ""}</div>
      </div>
      <button class="btn btn-danger" onclick="deleteTeam('${m.id}')">Delete</button>
    </article>
  `).join("");
}

function fillForms() {
  qs("identityTitle").value = dataCache.identity?.title || "";
  qs("identityP1").value = dataCache.identity?.paragraph1 || "";
  qs("identityP2").value = dataCache.identity?.paragraph2 || "";
  qs("socialInstagramAdmin").value = dataCache.socials?.instagram || "";
  qs("socialFacebookAdmin").value = dataCache.socials?.facebook || "";
  qs("socialXAdmin").value = dataCache.socials?.x || "";
  qs("socialLinkedInAdmin").value = dataCache.socials?.linkedin || "";
  identityPhotoData = dataCache.identity?.photo || "";
  setPreview("identityPhotoPreviewAdmin", identityPhotoData);
}

async function refreshData() {
  dataCache = await api("/api/admin/content");
  fillForms();
  renderPrograms();
  renderNews();
  renderTeam();
}

function setWriterMode() {
  ["saveIdentity", "addProgram", "addTeam", "saveSocials"].forEach((id) => {
    const el = qs(id);
    el.disabled = true;
    el.style.opacity = "0.5";
    el.style.cursor = "not-allowed";
  });
  ["identityPhotoFile", "teamPhotoFile", "programId", "programName", "programDesc", "teamName", "teamTitle", "teamContact", "socialInstagramAdmin", "socialFacebookAdmin", "socialXAdmin", "socialLinkedInAdmin", "identityTitle", "identityP1", "identityP2"]
    .forEach((id) => {
      const el = qs(id);
      if (el) el.disabled = true;
    });
}

async function login() {
  clearStatus();
  const username = qs("username").value.trim();
  const password = qs("password").value;
  const result = await api("/api/auth/login", "POST", { username, password });
  token = result.token;
  role = result.role;
  qs("loginCard").classList.add("hidden");
  qs("panel").classList.remove("hidden");
  qs("layoutRoot").classList.add("logged-in");
  if (role !== "admin") setWriterMode();
  await refreshData();
  setStatus(`Logged in as ${result.username} (${result.role}).`);
}

async function saveIdentity() {
  adminOnlyGuard();
  await api("/api/admin/identity", "PUT", {
    title: qs("identityTitle").value.trim(),
    photo: identityPhotoData,
    paragraph1: qs("identityP1").value.trim(),
    paragraph2: qs("identityP2").value.trim()
  });
  await refreshData();
  setStatus("Identity content saved.");
}

async function addProgram() {
  adminOnlyGuard();
  await api("/api/admin/programs", "POST", {
    id: qs("programId").value.trim(),
    name: qs("programName").value.trim(),
    description: qs("programDesc").value.trim()
  });
  qs("programId").value = "";
  qs("programName").value = "";
  qs("programDesc").value = "";
  await refreshData();
  setStatus("Program added.");
}

async function addNews() {
  await api("/api/admin/news", "POST", {
    title: qs("newsTitle").value.trim(),
    date: qs("newsDate").value,
    programId: qs("newsProgram").value,
    content: qs("newsContent").value.trim()
  });
  qs("newsTitle").value = "";
  qs("newsDate").value = "";
  qs("newsContent").value = "";
  await refreshData();
  setStatus("Article added.");
}

async function addTeam() {
  adminOnlyGuard();
  await api("/api/admin/team", "POST", {
    name: qs("teamName").value.trim(),
    title: qs("teamTitle").value.trim(),
    contact: qs("teamContact").value.trim(),
    photo: teamPhotoData
  });
  qs("teamName").value = "";
  qs("teamTitle").value = "";
  qs("teamContact").value = "";
  qs("teamPhotoFile").value = "";
  teamPhotoData = "";
  setPreview("teamPhotoPreviewAdmin", "");
  await refreshData();
  setStatus("Team member added.");
}

async function saveSocials() {
  adminOnlyGuard();
  await api("/api/admin/socials", "PUT", {
    instagram: qs("socialInstagramAdmin").value.trim(),
    facebook: qs("socialFacebookAdmin").value.trim(),
    x: qs("socialXAdmin").value.trim(),
    linkedin: qs("socialLinkedInAdmin").value.trim()
  });
  await refreshData();
  setStatus("Social links saved.");
}

async function deleteProgram(id) {
  adminOnlyGuard();
  await api(`/api/admin/programs/${id}`, "DELETE");
  await refreshData();
  setStatus("Program deleted.");
}

async function deleteNews(id) {
  await api(`/api/admin/news/${id}`, "DELETE");
  await refreshData();
  setStatus("Article deleted.");
}

async function deleteTeam(id) {
  adminOnlyGuard();
  await api(`/api/admin/team/${id}`, "DELETE");
  await refreshData();
  setStatus("Team member deleted.");
}

qs("loginBtn").addEventListener("click", () => login().catch((e) => setStatus(e.message, "error")));
qs("saveIdentity").addEventListener("click", () => saveIdentity().catch((e) => setStatus(e.message, "error")));
qs("addProgram").addEventListener("click", () => addProgram().catch((e) => setStatus(e.message, "error")));
qs("addNews").addEventListener("click", () => addNews().catch((e) => setStatus(e.message, "error")));
qs("addTeam").addEventListener("click", () => addTeam().catch((e) => setStatus(e.message, "error")));
qs("saveSocials").addEventListener("click", () => saveSocials().catch((e) => setStatus(e.message, "error")));
qs("identityPhotoFile").addEventListener("change", () => handleImageInput("identityPhotoFile", "identityPhotoPreviewAdmin", "identity").catch((e) => setStatus(e.message, "error")));
qs("teamPhotoFile").addEventListener("change", () => handleImageInput("teamPhotoFile", "teamPhotoPreviewAdmin", "team").catch((e) => setStatus(e.message, "error")));

window.deleteProgram = (id) => deleteProgram(id).catch((e) => setStatus(e.message, "error"));
window.deleteNews = (id) => deleteNews(id).catch((e) => setStatus(e.message, "error"));
window.deleteTeam = (id) => deleteTeam(id).catch((e) => setStatus(e.message, "error"));
