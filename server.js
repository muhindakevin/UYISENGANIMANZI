const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "content.json");

const users = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "writer", password: "writer123", role: "writer" }
];

const sessions = new Map();

app.use(express.json({ limit: "5mb" }));
app.use(express.static(__dirname));

function readContent() {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

function writeContent(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = sessions.get(token);
  if (!session) return res.status(401).json({ message: "Unauthorized" });
  req.user = session;
  next();
}

function roleRequired(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { username: user.username, role: user.role });
  res.json({ token, role: user.role, username: user.username });
});

app.get("/api/public/content", (req, res) => {
  res.json(readContent());
});

app.get("/api/public/news", (req, res) => {
  const { programId } = req.query;
  const data = readContent();
  const news = programId ? data.news.filter((n) => n.programId === programId) : data.news;
  res.json(news);
});

app.get("/api/admin/content", authRequired, (req, res) => {
  res.json(readContent());
});

app.put("/api/admin/identity", authRequired, roleRequired("admin"), (req, res) => {
  const data = readContent();
  data.identity = { ...data.identity, ...req.body };
  writeContent(data);
  res.json(data.identity);
});

app.put("/api/admin/socials", authRequired, roleRequired("admin"), (req, res) => {
  const data = readContent();
  data.socials = { ...data.socials, ...req.body };
  writeContent(data);
  res.json(data.socials);
});

app.get("/api/admin/programs", authRequired, (req, res) => {
  res.json(readContent().programs);
});

app.post("/api/admin/programs", authRequired, roleRequired("admin"), (req, res) => {
  const data = readContent();
  const payload = req.body || {};
  const id = payload.id || crypto.randomBytes(4).toString("hex");
  data.programs.push({ id, name: payload.name || "Program", description: payload.description || "" });
  writeContent(data);
  res.json(data.programs);
});

app.put("/api/admin/programs/:id", authRequired, roleRequired("admin"), (req, res) => {
  const data = readContent();
  const idx = data.programs.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Program not found" });
  data.programs[idx] = { ...data.programs[idx], ...req.body, id: data.programs[idx].id };
  writeContent(data);
  res.json(data.programs[idx]);
});

app.delete("/api/admin/programs/:id", authRequired, roleRequired("admin"), (req, res) => {
  const data = readContent();
  data.programs = data.programs.filter((p) => p.id !== req.params.id);
  data.news = data.news.filter((n) => n.programId !== req.params.id);
  writeContent(data);
  res.json({ ok: true });
});

app.get("/api/admin/news", authRequired, (req, res) => {
  res.json(readContent().news);
});

app.post("/api/admin/news", authRequired, roleRequired("admin", "writer"), (req, res) => {
  const data = readContent();
  const payload = req.body || {};
  const item = {
    id: payload.id || crypto.randomBytes(4).toString("hex"),
    title: payload.title || "Untitled News",
    content: payload.content || "",
    date: payload.date || new Date().toISOString().slice(0, 10),
    programId: payload.programId || ""
  };
  data.news.unshift(item);
  writeContent(data);
  res.json(data.news);
});

app.put("/api/admin/news/:id", authRequired, roleRequired("admin", "writer"), (req, res) => {
  const data = readContent();
  const idx = data.news.findIndex((n) => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "News not found" });
  data.news[idx] = { ...data.news[idx], ...req.body, id: data.news[idx].id };
  writeContent(data);
  res.json(data.news[idx]);
});

app.delete("/api/admin/news/:id", authRequired, roleRequired("admin", "writer"), (req, res) => {
  const data = readContent();
  data.news = data.news.filter((n) => n.id !== req.params.id);
  writeContent(data);
  res.json({ ok: true });
});

app.get("/api/admin/team", authRequired, (req, res) => {
  res.json(readContent().teamMembers);
});

app.post("/api/admin/team", authRequired, roleRequired("admin"), (req, res) => {
  const data = readContent();
  const payload = req.body || {};
  data.teamMembers.push({
    id: payload.id || crypto.randomBytes(4).toString("hex"),
    name: payload.name || "Team Member",
    title: payload.title || "Role",
    contact: payload.contact || "",
    photo: payload.photo || ""
  });
  writeContent(data);
  res.json(data.teamMembers);
});

app.put("/api/admin/team/:id", authRequired, roleRequired("admin"), (req, res) => {
  const data = readContent();
  const idx = data.teamMembers.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Team member not found" });
  data.teamMembers[idx] = { ...data.teamMembers[idx], ...req.body, id: data.teamMembers[idx].id };
  writeContent(data);
  res.json(data.teamMembers[idx]);
});

app.delete("/api/admin/team/:id", authRequired, roleRequired("admin"), (req, res) => {
  const data = readContent();
  data.teamMembers = data.teamMembers.filter((m) => m.id !== req.params.id);
  writeContent(data);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
