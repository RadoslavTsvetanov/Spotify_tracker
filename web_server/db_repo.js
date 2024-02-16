const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ensure uniqueness of usernames
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);

class DB_REPO {
  constructor(uri) {
    this.MONGODB_URI = uri;
    this.connectToDatabase();
  }

  async connectToDatabase() {
    try {
      await mongoose.connect(this.MONGODB_URI);
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      throw error;
    }
  }

  async add_to_db(item) {
    try {
      let existingUser = await User.findOne({ name: item.name });

      if (existingUser) {
        // Update the token of the existing user
        existingUser.token = item.token;
        await existingUser.save();
        return existingUser;
      } else {
        // Create a new user
        const newUser = new User({
          name: item.name,
          token: item.token,
        });
        await newUser.save();
        return newUser;
      }
    } catch (error) {
      console.error("Error adding user to the database:", error);
      throw error;
    }
  }

  async get_all_users() {
    try {
      const allUsers = await User.find({});
      return allUsers;
    } catch (error) {
      console.error("Error getting all users from the database:", error);
      throw error;
    }
  }
}

const DB = new DB_REPO(
  "mongodb+srv://rado:rado@task-manager.8d8g6sk.mongodb.net/?retryWrites=true&w=majority"
);
module.exports = { DB };
