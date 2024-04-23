import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text } from "@chakra-ui/layout";
import "./styles.css";
import { IconButton, Spinner, useToast } from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";
import { Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@chakra-ui/react";
import { AddIcon, Icon } from "@chakra-ui/icons"; // Import Icon from Chakra-UI
import { MdVideoLibrary } from 'react-icons/md'


import io from "socket.io-client";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
const ENDPOINT = "http://localhost:5000"; // "https://talk-a-tive.herokuapp.com"; -> After deployment
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [uploading, setUploading] = useState(false); // Define uploading state
  const [latestVideo, setLatestVideo] = useState(null);
  const [msglatestVideo, setmsgLatestVideo] = useState(null);
  const [showmVideoModal, setmShowVideoModal] = useState(false);
  const toast = useToast();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
  const { selectedChat, setSelectedChat, user, notification, setNotification } =
    ChatState();

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);

      const videoUrl = extractVideoUrlFromLastMessage(data);
      setmsgLatestVideo(videoUrl);
      console.log('Updated getting URL', videoUrl);
      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };
  const extractVideoUrlFromLastMessage = (messages) => {
    // Check if messages array is not empty
    if (messages.length > 0) {
      // Get the last message
      const lastMessage = messages[messages.length - 1];

      // Check if the last message has a videoUrl field
      if (lastMessage.videoUrl) {
        // If videoUrl exists, return it
        return lastMessage.videoUrl;
      } else {
        // If videoUrl does not exist, return null
        return null;
      }
    } else {
      // If messages array is empty, return null
      return null;
    }
  };



  useEffect(() => {
    const fetchLatestVideo = async () => {
      try {
        const response = await axios.get('/api/aws');
        const { latestVideo } = response.data;
        setLatestVideo(latestVideo);
      } catch (error) {
        console.error('Error fetching latest video:', error);
      }
    };

    fetchLatestVideo();
    fetchMessages();
  }, [latestVideo], [messages]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('video', file);
      const response = await axios.post('/api/aws', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setLatestVideo(response.data.videoUrl);
      console.log(response);
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setUploading(false);
    }
  };

  // Function to handle video upload
  const handleVideoUpload = () => {
    setShowVideoModal(true);
  };

  const handleVideoOpen = () => {
    setmShowVideoModal(true);
  };

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        setNewMessage("");
        console.log("Sending message with videoUrl:", latestVideo); // Add this console log
        const { data } = await axios.post(
          "/api/message",
          {
            content: newMessage,
            chatId: selectedChat,
            videoUrl: latestVideo,
          },
          config
        );
        socket.emit("new message", data);
        setMessages([...messages, data]);
        fetchMessages();
      } catch (error) {
        toast({
          title: "Error Occured!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
    fetchMessages();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchMessages();

    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    socket.on("message recieved", (newMessageRecieved) => {
      if (
        !selectedChatCompare || // if chat is not selected or doesn't match current chat
        selectedChatCompare._id !== newMessageRecieved.chat._id
      ) {
        if (!notification.includes(newMessageRecieved)) {
          setNotification([newMessageRecieved, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageRecieved]);
      }
    });
  });

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };



  console.log("Message :", messages);
  return (
    <>
      <Modal isOpen={showVideoModal} onClose={() => setShowVideoModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload Video</ModalHeader>
          <ModalBody>
            <input type="file" onChange={handleFileChange} accept="video/*" required />
            <button type="button" disabled={uploading} onClick={handleFileChange}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </ModalBody>
          <ModalFooter>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={showmVideoModal} onClose={() => setmShowVideoModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader> Video</ModalHeader>
          <ModalBody>
            <div id="latestVideo">
              {msglatestVideo ? (
                <video src={`https://sak-srp.s3.amazonaws.com/${msglatestVideo}`} controls />
              ) : (
                <p>No videos uploaded yet.</p>
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            fontFamily="Work sans"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              d={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {messages &&
              (!selectedChat.isGroupChat ? (
                <>
                  {getSender(user, selectedChat.users)}
                  <ProfileModal
                    user={getSenderFull(user, selectedChat.users)}
                  />
                </>
              ) : (
                <>
                  {selectedChat.chatName.toUpperCase()}
                  <UpdateGroupChatModal
                    fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                  />
                </>
              ))}
          </Text>
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            <div
              id="latestVideo"
              style={{
                position: "relative",
                width: "100%",
                paddingTop: "300px",
              }}
            >
              {msglatestVideo ? (
                <video
                  src={`https://sak-srp.s3.amazonaws.com/${msglatestVideo}`}
                  controls
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    top: "0",
                    left: "0",
                  }}
                />
              ) : (
                <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>No videos uploaded yet.</p>
              )}
            </div>
          </Box>
          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                <ScrollableChat messages={messages} />
              </div>
            )}

            <FormControl
              onKeyDown={sendMessage}
              id="first-name"
              isRequired
              mt={3}
            >
              {istyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    // height={50}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
              <Input
                variant="filled"
                bg="#E0E0E0"
                placeholder="Enter a message.."
                value={newMessage}
                onChange={typingHandler}
              />
              <Button
                onClick={handleVideoUpload}
                fontSize={{ base: "17px", md: "10px", lg: "17px" }}
                leftIcon={<Icon as={MdVideoLibrary} />} // Use Icon component with VideoIcon
              >
                Upload Video
              </Button>
              <Button
                onClick={handleVideoOpen}
                fontSize={{ base: "17px", md: "10px", lg: "17px" }}
                leftIcon={<Icon as={MdVideoLibrary} />} // Use Icon component with VideoIcon
              >
                Open Video
              </Button>
            </FormControl>
          </Box>
        </>
      ) : (
        // to get socket.io on same page
        <Box d="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Click on a user to start chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
