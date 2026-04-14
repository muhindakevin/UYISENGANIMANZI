let siteData = null;
let selectedProgramId = "all";

function showTab(id) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    const targetTab = document.getElementById(id);
    if (targetTab) targetTab.classList.add("active");
    closeMenuDropdowns();
    closeHamburgerMenu();
}

function toggleAboutMenu(event) {
    event.stopPropagation();
    const aboutMenu = document.getElementById("aboutMenu");
    if (!aboutMenu) return;
    closeProgramsMenu();
    aboutMenu.classList.toggle("open");
}

function toggleProgramsMenu(event) {
    event.stopPropagation();
    const programsMenu = document.getElementById("programsMenu");
    if (!programsMenu) return;
    closeAboutMenu();
    programsMenu.classList.toggle("open");
}

function closeAboutMenu() {
    const aboutMenu = document.getElementById("aboutMenu");
    if (aboutMenu) aboutMenu.classList.remove("open");
}

function closeProgramsMenu() {
    const programsMenu = document.getElementById("programsMenu");
    if (programsMenu) programsMenu.classList.remove("open");
}

function toggleHamburgerMenu() {
    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("nav-menu");
    if (!hamburger || !navMenu) return;
    const isOpen = !navMenu.classList.contains("active");
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
    closeMenuDropdowns();
}

function closeHamburgerMenu() {
    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("nav-menu");
    if (hamburger) {
        hamburger.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
    }
    if (navMenu) {
        navMenu.classList.remove("active");
    }
    document.body.classList.remove("menu-open");
}

function showTab(id) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    const targetTab = document.getElementById(id);
    if (targetTab) targetTab.classList.add("active");
    closeMenuDropdowns();
    closeHamburgerMenu();
}

function toggleAboutMenu(event) {
    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("nav-menu");
    if (hamburger) hamburger.classList.remove("active");
    if (navMenu) navMenu.classList.remove("active");
}

function openAboutSection(section) {
    const map = { identity: "identity", teams: "teams", board: "board" };
    if (map[section]) showTab(map[section]);
}

function openProgramSection(programId) {
    showTab("programs");
    selectedProgramId = programId;
    renderNews();
}

function updateIdentityPhoto(photo) {
    const photoEl = document.getElementById("identityPhotoPreview");
    const placeholderEl = document.getElementById("identityPhotoPlaceholder");
    if (!photoEl || !placeholderEl) return;
    if (photo) {
        photoEl.src = photo;
        photoEl.classList.add("show");
        placeholderEl.style.display = "none";
        photoEl.onerror = () => {
            photoEl.classList.remove("show");
            photoEl.removeAttribute("src");
            placeholderEl.style.display = "flex";
        };
    } else {
        photoEl.classList.remove("show");
        photoEl.removeAttribute("src");
        placeholderEl.style.display = "flex";
    }
}

function renderTeamMembers() {
    const container = document.getElementById("teamMembersGrid");
    if (!container) return;
    const members = siteData?.teamMembers || [];
    const fallbackImage = "IMAGES/logo.png";
    container.innerHTML = members.map((member) => `
        <div class="team-member-card">
            <img class="team-member-photo" src="${member.photo || fallbackImage}" alt="${member.name || "Team Member"}" onerror="this.src='${fallbackImage}'">
            <div class="team-member-info">
                <div class="team-member-title">${member.title || "Team Member"}</div>
                <h3 class="team-member-name">${member.name || "Unnamed Member"}</h3>
                <p class="team-member-contact">${member.contact || "Contact unavailable"}</p>
            </div>
        </div>
    `).join("");
}

function renderPrograms() {
    const grid = document.getElementById("programsGrid");
    if (!grid) return;
    const programs = siteData?.programs || [];
    grid.innerHTML = programs.map((program) => `
        <article class="program-item program-clickable" onclick="filterNewsByProgram('${program.id}')">
            <h2>${program.name}</h2>
            <p>${program.description || ""}</p>
        </article>
    `).join("");
}

function filterNewsByProgram(programId) {
    selectedProgramId = programId;
    showTab("news");
    renderNews();
}

function wireHomeProgramLinks() {
    const cards = document.querySelectorAll(".home-program-card");
    cards.forEach((card) => {
        card.addEventListener("click", () => {
            const programId = card.getAttribute("data-program-id");
            if (programId) filterNewsByProgram(programId);
        });
    });
}

function renderNewsFilter() {
    const filter = document.getElementById("newsFilter");
    if (!filter) return;
    const programs = siteData?.programs || [];
    const buttons = [
        `<button class="${selectedProgramId === "all" ? "active" : ""}" onclick="setNewsProgramFilter('all')">All</button>`
    ];
    programs.forEach((program) => {
        buttons.push(`<button class="${selectedProgramId === program.id ? "active" : ""}" onclick="setNewsProgramFilter('${program.id}')">${program.name}</button>`);
    });
    filter.innerHTML = buttons.join("");
}

function setNewsProgramFilter(programId) {
    selectedProgramId = programId;
    renderNews();
}

function renderNews() {
    const list = document.getElementById("newsList");
    if (!list) return;
    const programs = siteData?.programs || [];
    const programMap = Object.fromEntries(programs.map((p) => [p.id, p.name]));
    const allNews = siteData?.news || [];
    const news = selectedProgramId === "all"
        ? allNews
        : allNews.filter((item) => item.programId === selectedProgramId);
    renderNewsFilter();
    list.innerHTML = news.length ? news.map((item) => `
        <article class="news-item">
            <div class="news-meta">${programMap[item.programId] || "General"} | ${item.date || ""}</div>
            <h3>${item.title || "Untitled"}</h3>
            <p>${item.content || ""}</p>
        </article>
    `).join("") : `<article class="news-item"><p>No news in this category yet.</p></article>`;
}

function renderSocialLinks() {
    const socials = siteData?.socials || {};
    const mapping = [
        ["socialInstagram", socials.instagram],
        ["socialFacebook", socials.facebook],
        ["socialX", socials.x],
        ["socialLinkedIn", socials.linkedin]
    ];
    mapping.forEach(([id, href]) => {
        const link = document.getElementById(id);
        if (link && href) link.href = href;
    });
}

function updateIdentityText() {
    const identity = siteData?.identity || {};
    const content = document.querySelector(".identity-content");
    if (!content) return;
    const titleEl = content.querySelector("h1");
    const paragraphs = content.querySelectorAll("p");
    if (titleEl && identity.title) titleEl.textContent = identity.title;
    if (paragraphs[0] && identity.paragraph1) paragraphs[0].textContent = identity.paragraph1;
    if (paragraphs[1] && identity.paragraph2) paragraphs[1].textContent = identity.paragraph2;
}

async function loadSiteData() {
    try {
        const response = await fetch("/api/public/content");
        if (!response.ok) throw new Error("API unavailable");
        siteData = await response.json();
    } catch (error) {
        siteData = {
            identity: {
                title: "Our Identity",
                paragraph1: document.querySelector(".identity-content p")?.textContent || "",
                paragraph2: document.querySelectorAll(".identity-content p")[1]?.textContent || "",
                photo: ""
            },
            teamMembers: [],
            programs: [
                { id: "child", name: "Child Protection", description: "Holistic child protection and educational support." },
                { id: "mental", name: "Mental Health", description: "Awareness, healing, and community resilience." },
                { id: "economic", name: "Economic Empowerment", description: "Skills and financial literacy for families." }
            ],
            news: [],
            socials: {}
        };
    }
}

document.addEventListener("click", (event) => {
    const aboutMenu = document.getElementById("aboutMenu");
    const programsMenu = document.getElementById("programsMenu");
    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("nav-menu");
    const clickedAbout = aboutMenu && aboutMenu.contains(event.target);
    const clickedPrograms = programsMenu && programsMenu.contains(event.target);
    const clickedHamburger = hamburger && hamburger.contains(event.target);
    const clickedNavMenu = navMenu && navMenu.contains(event.target);
    if (!clickedAbout && !clickedPrograms) closeMenuDropdowns();
    if (!clickedHamburger && !clickedNavMenu) closeHamburgerMenu();
});

document.addEventListener("DOMContentLoaded", async () => {
    await loadSiteData();
    updateIdentityText();
    updateIdentityPhoto(siteData?.identity?.photo || "");
    renderTeamMembers();
    renderPrograms();
    renderNews();
    renderSocialLinks();
    wireHomeProgramLinks();

    // Hamburger menu
    const hamburger = document.getElementById("hamburger");
    if (hamburger) {
        hamburger.addEventListener("click", toggleHamburgerMenu);
    }
});