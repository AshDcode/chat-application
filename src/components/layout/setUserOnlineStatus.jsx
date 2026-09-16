import {
    getDatabase,
    ref,
    onDisconnect,
    set,
    serverTimestamp,
} from "firebase/database";
import app from "../../firebaseConfig";

const database = getDatabase(app);

export const setUserOnlineStatus = (user) => {
    if (!user) return;

    const statusRef = ref(database, `/status/${user.uid}`);

    onDisconnect(statusRef).set({
        state: "offline",
        last_changed: serverTimestamp(),
    });

    set(statusRef, {
        state: "online",
        last_changed: serverTimestamp(),
    });
};