const express = require("express");
const cors = require("cors");
const UserModel = require("./models/usermodel");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const app = express();
const jwt = require("jsonwebtoken");
const secret = "2736gf76234t";
const saltRound = 10;
const Post = require("./models/post");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const fs = require("fs");
const { info } = require("console");
const uploadMiddleware = multer({ dest: "uploads/" });
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));
mongoose.connect("mongodb://localhost:27017/My_Blog");

app.post("/register", async (req, res) => {
  console.log(req.body);
  const { username, password } = req.body;
  try {
    const userDoc = await UserModel.create({
      username,
      password: bcrypt.hashSync(password, saltRound),
    });

    res.json(userDoc);
    return;
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
    return;
  }
});

// app.post("/register", async (req, res) => {
//   const { username, password } = req.body;
//   console.log(username + " " + password);
//   try {
//     // Kiểm tra xem người dùng đã tồn tại chưa
//     const existingUser = await UserModel.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({
//         error: "Tên đăng nhập đã tồn tại. Vui lòng chọn một tên khác.",
//       });
//     }

//     // Thêm người dùng mới
//     const userDoc = await UserModel.create({
//       username,
//       password,
//     });

//     res.json(userDoc);
//   } catch (error) {
//     console.log(error);

//     // Kiểm tra xem lỗi có phải do trùng khóa không
//     if (
//       error.code === 11000 &&
//       error.keyPattern &&
//       error.keyPattern.Username === 1
//     ) {
//       return res.status(400).json({
//         error: "Tên đăng nhập đã tồn tại. Vui lòng chọn một tên khác.",
//       });
//     }

//     res.status(500).json({ error: "Đã xảy ra lỗi khi đăng ký người dùng." });
//   }
// });

// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   const userDoc = await UserModel.findOne({ username });
//   const passOk = bcrypt.compareSync(password, userDoc.password);
//   if (passOk) {
//     // logged in
//     jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
//       if (err) throw err;
//       res.cookie("token", token).json({
//         id: userDoc._id,
//         username,
//       });
//     });
//   } else {
//     res.status(400).json("wrong credentials");
//   }
// });

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const userDoc = await UserModel.findOne({ username });
    const passOK = bcrypt.compareSync(password, userDoc.password);
    if (passOK) {
      jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
        if (err) {
          throw err;
        }
        res.cookie("token", token).json({
          id: userDoc._id,
          username,
        });
      });
    } else {
      res.json(400).json("Wrong");
      return;
    }

    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
    return;
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  try {
    const { filename, path } = req.file;

    const parts = filename.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;
      const { title, summary, content } = req.body;
      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author: info.id,
      });
      res.json(postDoc);
    });
  } catch (error) {
    res.status(400).json(req.file);
  }
});

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json("you are not the author");
    }
    await postDoc.updateOne({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });
});

app.get("/post", async (req, res) => {
  const posts = await Post.find()
    .populate("author", ["username"])
    .sort({ createdAt: -1 })
    .limit(20);
  res.json(posts);
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.listen(4000);
