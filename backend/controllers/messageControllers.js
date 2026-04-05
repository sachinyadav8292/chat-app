const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");

    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  // ✅ Validation
  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.status(400).json({ message: "Invalid data" });
  }

  const newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    // ✅ Create message
    let message = await Message.create(newMessage);

    // ✅ FIXED POPULATE (no execPopulate)
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("chat.users", "name pic email");

    // ✅ Update latest message
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message,
    });

    res.json(message);

  } catch (error) {
    console.log("BACKEND ERROR:", error); // 🔥 debug
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage };