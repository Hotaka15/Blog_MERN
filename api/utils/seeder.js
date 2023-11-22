const Post = require("../models/post");
const mongoose = require("mongoose");
const data = require("../data/My_Blog.posts.json");

mongoose.connect("mongodb://localhost:27017/My_Blog");

const seedProducts = async () => {
  try {
    await Post.deleteMany();
    console.log("Products are deleted");

    await Post.insertMany(data);
    console.log("All post are added");
    process.exit();
  } catch (e) {
    console.log(e.message);
    process.exit();
  }
};

seedProducts();
