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

        const unsubscribe = onSnapshot(collection(db, "users"), async (snapshot) => {
            const userList = await Promise.all(
                snapshot.docs
                    .filter((docSnap) => docSnap.data().uid !== currentUser.uid)
                    .map(async (docSnap) => {
                        const userData = docSnap.data();
                        const statusSnap = await get(rtdbRef(rtdb, `/status/${userData.uid}`));
                        const status = statusSnap.val();

                        return {
                            ...userData,
                            online: status?.state === "online",
                            last_changed: status?.last_changed,
                            photoURL:
                                userData.photoURL
                                    ? `${userData.photoURL}?t=${Date.now()}`
                                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        userData.displayName || userData.name || "User"
                                    )}`,
                        };
                    })
            );
            setUsers(userList);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // ssubscribe to typing status.
    useEffect(() => {
        if (!currentUser?.uid) return;

        const unsubFns = [];

        const subscribeTyping = async () => {
            const snapshot = await getDocs(collection(db, "users"));
            snapshot.docs
                .filter((docSnap) => docSnap.data().uid !== currentUser.uid)
                .forEach((docSnap) => {
                    const otherUser = docSnap.data();
                    const typingRef = rtdbRef(rtdb, `/typing/${currentUser.uid}/${otherUser.uid}`);

                    const listener = (snap) => {
                        setIsTyping((prev) => ({
                            ...prev,
                            [otherUser.uid]: snap.exists(),
                        }));
                    };

                    onValue(typingRef, listener);
                    unsubFns.push(() => rtdb.off(typingRef, "value", listener));
                });
        };

        subscribeTyping();

        return () => unsubFns.forEach((fn) => fn());
    }, [currentUser]);

// subscribe to messages
useEffect(() => {
    if (!currentUser?.uid) return;

    // first find all chats that involve current user
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsub = onSnapshot(q, (chatSnap) => {
        // for each chat document
        const messageUnsub = [];
        chatSnap.docs.forEach((chatDoc) => {
            const chatId = chatDoc.id;
            const msgQuery = query(
                collection(db, "chats", chatId, "messages"),
                orderBy("createdAt")
            );

            const msgUnsub = onSnapshot(msgQuery, (msgSnap) => {
                // Append chatId to messages so we can identify
                const msgs = msgSnap.docs.map((d) => ({
                    ...d.data(),
                    id: d.id,
                    chatId
                }));
                // Combine all messages
                setAllMessages((prev) => {
                    // Remove any messages from this chatId
                    const others = prev.filter((m) => m.chatId !== chatId);
                    return [...others, ...msgs];
                });
            });

            messageUnsub.push(msgUnsub);
        });

        // cleanup on unmount
        return () => messageUnsub.forEach((fn) => fn());
    });

    return () => unsub();
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

                    {user.isTyping && (
                        <div className="typing-indicator">Typing...</div>
                    )}

                </div>
            ))}
    </div>
);
        };

export default ChatList;