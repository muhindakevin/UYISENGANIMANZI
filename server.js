const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/uyisenganimanzi";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(async () => {
  console.log("Connected to MongoDB");
  // Seed initial data
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create([
      { username: "admin", password: "admin123", role: "admin" },
      { username: "writer", password: "writer123", role: "writer" }
    ]);
    console.log("Seeded initial users");
  }
})
  .catch(err => console.error("MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
});

const contentSchema = new mongoose.Schema({
  identity: {
    title: String,
    description: String,
    photo: String
  },
  socials: {
    x: String,
    instagram: String,
    linkedin: String,
    facebook: String
  },
  programs: [{
    id: { type: String, required: true },
    name: String,
    description: String
  }],
  news: [{
    id: { type: String, required: true },
    title: String,
    content: String,
    date: String,
    programId: String
  }],
  teamMembers: [{
    id: { type: String, required: true },
    name: String,
    title: String,
    contact: String,
    photo: String
  }]
});

const User = mongoose.model("User", userSchema);
const Content = mongoose.model("Content", contentSchema);

const sessions = new Map();

app.use(express.json({ limit: "5mb" }));
app.use(express.static(__dirname));

async function getContent() {
  let content = await Content.findOne();
  if (!content) {
    content = new Content({
      identity: { title: "UYISENGA NI IMANZI", description: "Non-profit organization", photo: "" },
      socials: { x: "", instagram: "", linkedin: "", facebook: "" },
      programs: [],
      news: [],
      teamMembers: []
    });
    await content.save();
  }
  return content;
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

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { username: user.username, role: user.role });
  res.json({ token, role: user.role, username: user.username });
});

app.get("/api/public/content", async (req, res) => {
  const content = await getContent();
  res.json(content);
});

app.get("/api/public/news", async (req, res) => {
  const { programId } = req.query;
  const content = await getContent();
  const news = programId ? content.news.filter((n) => n.programId === programId) : content.news;
  res.json(news);
});

app.get("/api/admin/content", authRequired, async (req, res) => {
  const content = await getContent();
  res.json(content);
});

app.put("/api/admin/identity", authRequired, roleRequired("admin"), async (req, res) => {
  const content = await getContent();
  content.identity = { ...content.identity, ...req.body };
  await content.save();
  res.json(content.identity);
});

app.put("/api/admin/socials", authRequired, roleRequired("admin"), async (req, res) => {
  const content = await getContent();
  content.socials = { ...content.socials, ...req.body };
  await content.save();
  res.json(content.socials);
});

app.get("/api/admin/programs", authRequired, async (req, res) => {
  const content = await getContent();
  res.json(content.programs);
});

app.post("/api/admin/programs", authRequired, roleRequired("admin"), async (req, res) => {
  const content = await getContent();
  const payload = req.body || {};
  const id = payload.id || crypto.randomBytes(4).toString("hex");
  content.programs.push({ id, name: payload.name || "Program", description: payload.description || "" });
  await content.save();
  res.json(content.programs);
});

app.put("/api/admin/programs/:id", authRequired, roleRequired("admin"), async (req, res) => {
  const content = await getContent();
  const program = content.programs.id(req.params.id);
  if (!program) return res.status(404).json({ message: "Program not found" });
  Object.assign(program, req.body);
  await content.save();
  res.json(program);
});

app.delete("/api/admin/programs/:id", authRequired, roleRequired("admin"), async (req, res) => {
  const content = await getContent();
  content.programs = content.programs.filter((p) => p.id !== req.params.id);
  content.news = content.news.filter((n) => n.programId !== req.params.id);
  await content.save();
  res.json({ ok: true });
});

app.get("/api/admin/news", authRequired, async (req, res) => {
  const content = await getContent();
  res.json(content.news);
});

app.post("/api/admin/news", authRequired, roleRequired("admin", "writer"), async (req, res) => {
  const content = await getContent();
  const payload = req.body || {};
  const item = {
    id: payload.id || crypto.randomBytes(4).toString("hex"),
    title: payload.title || "Untitled News",
    content: payload.content || "",
    date: payload.date || new Date().toISOString().slice(0, 10),
    programId: payload.programId || ""
  };
  content.news.unshift(item);
  await content.save();
  res.json(content.news);
});

app.put("/api/admin/news/:id", authRequired, roleRequired("admin", "writer"), async (req, res) => {
  const content = await getContent();
  const newsItem = content.news.id(req.params.id);
  if (!newsItem) return res.status(404).json({ message: "News not found" });
  Object.assign(newsItem, req.body);
  await content.save();
  res.json(newsItem);
});

app.delete("/api/admin/news/:id", authRequired, roleRequired("admin", "writer"), async (req, res) => {
  const content = await getContent();
  content.news = content.news.filter((n) => n.id !== req.params.id);
  await content.save();
  res.json({ ok: true });
});

app.get("/api/admin/team", authRequired, async (req, res) => {
  const content = await getContent();
  res.json(content.teamMembers);
});

app.post("/api/admin/team", authRequired, roleRequired("admin"), async (req, res) => {
  const content = await getContent();
  const payload = req.body || {};
  content.teamMembers.push({
    id: payload.id || crypto.randomBytes(4).toString("hex"),
    name: payload.name || "Team Member",
    title: payload.title || "Role",
    contact: payload.contact || "",
    photo: payload.photo || ""
  });
  await content.save();
  res.json(content.teamMembers);
});

app.put("/api/admin/team/:id", authRequired, roleRequired("admin"), async (req, res) => {
  const content = await getContent();
  const member = content.teamMembers.id(req.params.id);
  if (!member) return res.status(404).json({ message: "Team member not found" });
  Object.assign(member, req.body);
  await content.save();
  res.json(member);
});

app.delete("/api/admin/team/:id", authRequired, roleRequired("admin"), async (req, res) => {
  const content = await getContent();
  content.teamMembers = content.teamMembers.filter((m) => m.id !== req.params.id);
  await content.save();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
