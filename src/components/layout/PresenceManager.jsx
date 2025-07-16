import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebaseConfig";
import { useEffect } from "react";
import { onDisconnect, ref, serverTimestamp } from "firebase/database";

export default function PresenceManager() {
    const [user] = useAuthState(auth);

    useEffect(() => {
        if (!user) return;

        const userStatusDatabaseRef = ref(rtdb, `/status/${user.uid}`);

        const isOnlineForDatabase = {
            state: "offline",
            last_changed: serverTimestamp(),
        };

        const isOfflineForDatabase = {
            state: "offline",
            last_changed: serverTimestamp(),
        };

        // set to online when connected
        const connectedRef = ref(rtdb, ".info/connected");
        const unsubscribe = connectedRef.on("value", (snapshot) => {
            if (snapshot.val() === false) {
                return;
            }
            // on disconnect set offline.

            onDisconnect(userStatusDatabaseRef)
                .set(isOfflineForDatabase)
                .then(() => {
                    // immediately set online
                    set(userStatusDatabaseRef, isOnlineForDatabase);
                });
        });

        return () => connectedRef.off("value", unsubscribe);
    }, [user]);

}