import { formatChatDate } from "../../utils/formatDate";
import { useEffect, useRef, useState } from "react"
import { auth, db, rtdb } from "../../firebaseConfig";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { ref as dbRef, set, onValue, remove } from "firebase/database";
import "./ChatRoom.css";

const ChatRoom = ({ selectedUser }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [typingUserName, setTypingUserName] = useState("");
    const messagesEndRef = useRef(null);

    const currentUserId = auth.currentUser?.uid;
    const otherUserId = selectedUser?.uid;

    // create consistent chat ID by sorting user UIDs

    const chatId = [currentUserId, otherUserId].sort().join("_");

    // Listen for messages for this chatId
    useEffect(() => {
        if (!chatId || !currentUserId || !otherUserId) return;

        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("createdAt"),
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setMessages(docs);
            // For any unread messages sent *by the other user*, mark as read
            const unread = docs.filter(
                (msg) => msg.isRead === false && msg.uid !== currentUserId
            );

            const updates = unread.map((msg) =>
                setDoc(
                    doc(db, "chats", chatId, "messages", msg.id),
                    { isRead: true },
                    { merge: true }
                )
            );
            await Promise.all(updates);
        });

        return () => unsubscribe();
    }, [chatId, currentUserId, otherUserId]);

    // auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // send message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (input.trim() === "") return;

        const chatRef = doc(db, "chats", chatId);
        console.log("sending msg, chatId:", chatId);
        // check if chat document exist create if  not
        try {
            const chatSnap = await getDoc(chatRef);
            if (!chatSnap.exists()) {
                console.log("Creating new chat doc", chatId);
                await setDoc(chatRef, {
                    participants: [currentUserId, otherUserId],
                    createdAt: serverTimestamp(),
                });
            }
            console.log("Current user ID:", auth.currentUser?.uid);
            // send message
            console.log("Adding message in:", chatId);
            await addDoc(collection(db, "chats", chatId, "messages"), {
                text: input,
                uid: auth.currentUser.uid,
                displayName: auth.currentUser.displayName || "You",
                photoURL: auth.currentUser.photoURL || "",
                createdAt: serverTimestamp(),
                isRead: false,
            });
            console.log("Message sent ✅");
        }
        catch (err) {
            console.error("Firestore error during sendMessage:", err);
            alert("Error sending message: " + err.message);
        }
        setInput("");
    };

    const typingTimeoutRef = useRef();

    const handleTyping = (e) => {
        setInput(e.target.value);

        // Show typing status
        const typingRef = dbRef(rtdb, `/typing/${otherUserId}`);
        set(typingRef, {
            uid: currentUserId,
            displayName: auth.currentUser.displayName || "You"
        });

        // Auto remove typing status after a delay (debounce-style)
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            remove(typingRef);
        }, 2000); // 2 seconds after last keypress
    };

    useEffect(() => {
        if (!otherUserId) return;

        const typingRef = dbRef(rtdb, `/typing/${currentUserId}`);
        const unsubscribe = onValue(typingRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setTypingUserName(data.displayName);
                setIsTyping(true);
            } else {
                setIsTyping(false);
            }
        });

        return () => unsubscribe();
    }, [currentUserId, otherUserId]);



    if (!currentUserId || !otherUserId) {
        return (
            <div className="chat-container">
                <div className="chat-header">
                    <h2 className="chat-header-name">No user selected</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            <div className="chat-header">
                <h2 className="chat-header-name">
                    {selectedUser?.name || selectedUser?.displayName || "User"}
                </h2>
                {isTyping && (
                    <div className="typing-status">
                        {typingUserName} is typing...
                    </div>
                )}
            </div>
            <div className="messages-container">
                {messages.map((msg) => {
                    // convert timestamp into readable format.
                    const isOwnMessage = msg.uid === currentUserId;
                    const time = msg.createdAt?.toDate?.().toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    return (
                        <div
                            key={msg.id}
                            className={`message ${isOwnMessage ? 'sent' : 'received'}`}>
                            <img className="message-avatar"
                                src={msg.photoURL ||
                                    `https://ui-avatars.com/api/?name=${msg.displayName}&background=random&bold=true`
                                }
                                alt="User"
                                width="30" />
                            <div className="message-content">
                                <p>{msg.text}</p>
                                <div className="message-meta">
                                    {msg.createdAt?.toDate && (
                                        <small style={{ color: "gray", fontSize: "0.75rem" }}>
                                            Sent: {formatChatDate(msg.createdAt.toDate())}
                                        </small>
                                    )}
                                    {msg.isRead && (
                                        <small style={{ color: "green", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                                            ✓ Read
                                        </small>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form
                className="chat-form" onSubmit={sendMessage}>
                <input value={input}
                    className="chat-input"
                    onChange={handleTyping}
                    placeholder="Type a message...."
                />
                <button
                    className="chat-send-btn" type="submit">Send</button>
            </form>
        </div>
    );
};

export default ChatRoom;