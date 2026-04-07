const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// config
dotenv.config();
connectDB();

const app = express();

// middleware
app.use(express.json());

// ---------------- API ROUTES ----------------
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// ---------------- ROOT ROUTE ----------------
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ---------------- ERROR HANDLING ----------------
app.use(notFound);
app.use(errorHandler);

// ---------------- SERVER START ----------------
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});

// ---------------- SOCKET.IO ----------------
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*", // 🔥 allow all (safe for now)
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  // setup user
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.userData = userData;
    socket.emit("connected");
  });

  // join chat room
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  // typing events
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  // new message
  socket.on("new message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id === newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("USER DISCONNECTED");
    if (socket.userData) {
      socket.leave(socket.userData._id);
    }
  });
});