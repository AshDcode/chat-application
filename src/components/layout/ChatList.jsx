import { collection, getDoc, getDocs, onSnapshot, where, doc, setDoc, orderBy } from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import "./ChatList.css";
import { db, rtdb } from "../../firebaseConfig";
import { ref as rtdbRef, get, query, onValue } from "firebase/database";
// import { ref, onValue, query } from "firebase/database";
import { AuthContext } from "./AuthContext";
import { formatDistanceToNow } from "date-fns";

export const ChatList = ({ onSelectUser }) => {
    const [users, setUsers] = useState([]);
    const [allMessages, setAllMessages] = useState([]);
    const [activeUserId, setActiveUserId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isTyping, setIsTyping] = useState({});

    const { currentUser } = useContext(AuthContext);

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return "";
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    // fetch users
    useEffect(() => {
        if (!currentUser?.uid) return;

        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const userList = snapshot.docs
                .filter((docSnap) => docSnap.data().uid !== currentUser.uid)
                .map((docSnap) => {
                    const userData = docSnap.data();

                    return {
                        ...userData,
                        online: false,
                        last_changed: null,
                        photoURL:
                            userData.photoURL ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                userData.displayName || userData.name || "User"
                            )}`,
                    };
                });

            setUsers(userList);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // subscribe to users' online/offline status
    useEffect(() => {
        if (!users.length) return;

        const unsubscribers = [];

        users.forEach((user) => {
            const statusRef = rtdbRef(rtdb, `/status/${user.uid}`);

            const unsubscribe = onValue(statusRef, (snapshot) => {
                const status = snapshot.val();

                setUsers((prevUsers) =>
                    prevUsers.map((currentUser) =>
                        currentUser.uid === user.uid
                            ? {
                                ...currentUser,
                                online: status?.state === "online",
                                last_changed: status?.last_changed || null,
                            }
                            : currentUser
                    )
                );
            });

            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, [users.length]);

    // subscribe to typing status
    useEffect(() => {
        if (!currentUser?.uid || !users.length) return;

        const unsubscribers = [];

        users.forEach((otherUser) => {
            const typingRef = rtdbRef(
                rtdb,
                `/typing/${currentUser.uid}/${otherUser.uid}`
            );

            const unsubscribe = onValue(typingRef, (snapshot) => {
                setIsTyping((prev) => ({
                    ...prev,
                    [otherUser.uid]: snapshot.exists(),
                }));
            });

            unsubscribers.push(unsubscribe);
        });

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
        };
    }, [currentUser?.uid, users.length]);

    // subscribe to messages
    useEffect(() => {
        if (!currentUser?.uid) return;

        const q = query(
            collection(db, "chats"),
            where("participants", "array-contains", currentUser.uid)
        );

        const messageUnsubscribers = new Map();

        const unsubscribeChats = onSnapshot(q, (chatSnap) => {
            const currentChatIds = new Set(
                chatSnap.docs.map((chatDoc) => chatDoc.id)
            );

            // Remove listeners for chats that are no longer available
            messageUnsubscribers.forEach((unsubscribe, chatId) => {
                if (!currentChatIds.has(chatId)) {
                    unsubscribe();
                    messageUnsubscribers.delete(chatId);

                    setAllMessages((prev) =>
                        prev.filter((message) => message.chatId !== chatId)
                    );
                }
            });

            // Add listeners for newly discovered chats
            chatSnap.docs.forEach((chatDoc) => {
                const chatId = chatDoc.id;

                if (messageUnsubscribers.has(chatId)) return;

                const msgQuery = query(
                    collection(db, "chats", chatId, "messages"),
                    orderBy("createdAt")
                );

                const unsubscribeMessages = onSnapshot(
                    msgQuery,
                    (msgSnap) => {
                        const msgs = msgSnap.docs.map((d) => ({
                            ...d.data(),
                            id: d.id,
                            chatId
                        }));

                        setAllMessages((prev) => {
                            const others = prev.filter(
                                (message) => message.chatId !== chatId
                            );

                            return [...others, ...msgs];
                        });
                    },
                    (error) => {
                        console.error(
                            `Error listening to messages for chat ${chatId}:`,
                            error
                        );
                    }
                );

                messageUnsubscribers.set(chatId, unsubscribeMessages);
            });
        });

        return () => {
            unsubscribeChats();

            messageUnsubscribers.forEach((unsubscribe) => unsubscribe());
            messageUnsubscribers.clear();

            setAllMessages([]);
        };
    }, [currentUser]);

    const handleSelect = async (user) => {
        if (!currentUser?.uid || !user?.uid) return;
        const uid1 = currentUser.uid;
        const uid2 = user.uid;
        const chatId = [uid1, uid2].sort().join("_");

        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            await setDoc(chatRef, {
                participants: [uid1, uid2],
                createdAt: new Date()
            });
        }

        onSelectUser(user);
        setActiveUserId(user.uid);
    };

    const getUnreadCount = (userId) => {
        const chatId = [currentUser.uid, userId].sort().join("_");
        return allMessages.filter(
            (msg) => msg.chatId === chatId && msg.uid === userId && msg.isRead === false
        ).length;
    };

    return (
        <div className="chat-list">
            <h3 className="chat-list-heading">Chats</h3>
            <input
                type="text"
                className="chat-search"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {users
                .filter((user) =>
                    (user.displayName || user.name || "").toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((user) => (
                    <div
                        key={user.uid}
                        className={`chat-list-item ${user.uid === activeUserId ? "active-user" : ""}`}
                        onClick={() => handleSelect(user)}
                    >
                        <div className="avatar-container">
                            <img src={user.photoURL} alt="User" className="user-avatar" width="30" />
                            <span className={user.online ? "online-dot" : "offline-dot"} />
                        </div>

                        <span className="chat-user-name">
                            {user.displayName || user.name || user.email || user.uid.slice(0, 7)}
                        </span>

                        {!user.online && user.last_changed && (
                            <div className="last-seen">
                                Last seen: {formatTimestamp(user.last_changed)}
                            </div>
                        )}

                        {getUnreadCount(user.uid) > 0 && (
                            <span className="unread-badge">{getUnreadCount(user.uid)}</span>
                        )}

                        {isTyping[user.uid] && (
                            <div className="typing-indicator">Typing...</div>
                        )}

                    </div>
                ))}
        </div>
    );
};

export default ChatList;