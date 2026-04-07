// 🔥 MOVE THIS LINE TO index.js (IMPORTANT)
// axios.defaults.baseURL = ENDPOINT;

import {
  Box,
  Text,
  FormControl,
  Input,
  IconButton,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import "./styles.css";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";
import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";

// 🔥 LIVE BACKEND
const ENDPOINT = "https://chat-app-backend-g78y.onrender.com";

var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);

  const toast = useToast();

  const { selectedChat, setSelectedChat, user, notification, setNotification } =
    ChatState();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
  };

  // ✅ FETCH MESSAGES
  const fetchMessages = async () => {
    if (!selectedChat?._id) return;

    try {
      setLoading(true);

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );

      setMessages(data);
      setLoading(false);

      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load Messages",
        status: "error",
      });
    }
  };

  // ✅ SEND MESSAGE
  const sendMessage = async (e) => {
    if (e.key === "Enter") {
      if (!newMessage.trim()) return;
      if (!selectedChat?._id) return;

      socket.emit("stop typing", selectedChat._id);

      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        const messageToSend = newMessage;
        setNewMessage("");

        const { data } = await axios.post(
          "/api/message",
          {
            content: messageToSend,
            chatId: selectedChat._id,
          },
          config
        );

        socket.emit("new message", data);

      } catch (error) {
        console.log(error.response?.data);
      }
    }
  };

  // ✅ SOCKET SETUP
  useEffect(() => {
    socket = io(ENDPOINT, {
      transports: ["websocket"],
    });

    socket.emit("setup", user);

    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));

    return () => socket.disconnect(); // 🔥 CLEANUP
  }, []);

  // ✅ LOAD MESSAGES
  useEffect(() => {
    if (selectedChat?._id) {
      fetchMessages();
      selectedChatCompare = selectedChat;
    }
  }, [selectedChat]);

  // ✅ RECEIVE MESSAGE
  useEffect(() => {
    socket.on("message recieved", (msg) => {
      if (!selectedChatCompare || selectedChatCompare._id !== msg.chat._id) {
        setNotification((prev) => [msg, ...prev]);
        setFetchAgain((prev) => !prev);
      } else {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("message recieved");
  }, [selectedChat]);

  // ✅ TYPING
  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected || !selectedChat?._id) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }

    setTimeout(() => {
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);
    }, 3000);
  };

  return (
    <>
      {selectedChat ? (
        <>
          <Text fontSize="30px" pb={3} w="100%" display="flex" justifyContent="space-between">
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />

            {!selectedChat.isGroupChat ? (
              <>
                {getSender(user, selectedChat.users)}
                <ProfileModal user={getSenderFull(user, selectedChat.users)} />
              </>
            ) : (
              <>
                {selectedChat.chatName.toUpperCase()}
                <UpdateGroupChatModal />
              </>
            )}
          </Text>

          <Box display="flex" flexDir="column" p={3} bg="#E8E8E8" w="100%" h="100%">
            {loading ? <Spinner size="xl" margin="auto" /> : <ScrollableChat messages={messages} />}

            <FormControl onKeyDown={sendMessage} mt={3}>
              {istyping && <Lottie options={defaultOptions} width={70} />}

              <Input
                disabled={!selectedChat?._id}
                placeholder="Enter a message..."
                value={newMessage}
                onChange={typingHandler}
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box display="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl">Click on a user to start chatting</Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;