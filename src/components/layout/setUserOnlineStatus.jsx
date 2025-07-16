// import { serverTimestamp } from "firebase/firestore";
import { getDatabase, ref, onDisconnect, set } from "firebase/database";
import app from "../../firebaseConfig";

const database = getDatabase(app);

const getCurrentTimeStamp = () => {
    return Date.now();
};

export const setUserOnlineStatus = (user) => {

    if(!user) return;
    const statusRef = ref(database, `/status/${user.uid}`);

    //when online
    set(statusRef, {
        state: "online",
        last_changed: getCurrentTimeStamp(),
    });

    // when disconnects
    onDisconnect(statusRef).set({
        state: "offline",
        last_changed: getCurrentTimeStamp(),
    });
};