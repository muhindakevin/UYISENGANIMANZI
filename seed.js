const mongoose = require("mongoose");
const User = require("./server").User; // Wait, better to define models in a separate file.

Actually, let's create a seed.js file that requires the models from server.js, but since server.js exports them, better to refactor.

For simplicity, add seeding in server.js on startup.

But to keep it clean, create a separate seed.js. 

Since the models are defined in server.js, and it's not exported, I'll add a seeding function in server.js that runs once.

Add after mongoose.connect:

// Seed initial data
async function seedData() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create([
      { username: "admin", password: "admin123", role: "admin" },
      { username: "writer", password: "writer123", role: "writer" }
    ]);
    console.log("Seeded initial users");
  }
}

mongoose.connect(...).then(async () => {
  console.log("Connected to MongoDB");
  await seedData();
});