import { useEffect, useState } from "react"
import { auth, db, storage } from "../../firebaseConfig"
import { updateProfile } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import "./UpdateProfile.css";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

const UpdateProfile = ({ isOpen, onClose }) => {
    const [user, loading] = useAuthState(auth);
    const [displayName, setDisplayName] = useState("");
    const [photoFile, setPhotoFile] = useState(null);
    const [message, setMessage] = useState("");
    const [updating, setUpdating] = useState(false);
    const [photoURL, setPhotoURL] = useState("");

    // const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
            setPhotoFile(null);
            setPhotoURL(user.photoURL || "");
        }
    }, [user, isOpen]);

    if (loading || !user || !isOpen) return null; //dont render if user is not availabele yet.

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true)
        console.log("Current user:", auth.currentUser);

        try {
            let uploadedURL = user.photoURL;

            //if new file selected
            if (photoFile) {
                const fileRef = ref(storage, `profileImages/${user.uid}_${Date.now()}`);
                const uploadTask = uploadBytesResumable(fileRef, photoFile);
                // wait until upload comletes
                await new Promise((resolve, reject) => {
                    uploadTask.on(
                        'state_changed',
                        null,
                        (error) => reject(error),
                        () => resolve()
                    );
                });

                uploadedURL = await getDownloadURL(fileRef);
            }
            await updateProfile(auth.currentUser, {
                displayName,
                photoURL: uploadedURL,
            });
            await user.reload();
            // update firestore users collection
            await updateDoc(doc(db, "users", user.uid),
                {
                    displayName,
                    photoURL: uploadedURL,
                    updatedAt: new Date()
                });

            setMessage("Profile updated successfully");
            setTimeout(() => {
                setMessage("");
                onClose();
            }, 3000);
            // setShowModal(false);
        } catch (error) {
            console.log(error);
            setMessage("Failed to update profile");
        } finally {
            setUpdating(false);
        }
    };
    return (
        <div>
            <div className="modal-overlay">
                <div className="modal-content">
                    <h3 className="modal-heading">Update Profile</h3>
                    <form onSubmit={handleSubmit} className="modal-form">
                        <input
                            className="modal-input"
                            type="text"
                            placeholder="Display Name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                        <input
                            className="modal-input"
                            type="file"
                            accept="image/*"
                            placeholder="Photo URL"
                            // value={photoURL}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                setPhotoFile(file);
                                if (file) {
                                    setPhotoURL(URL.createObjectURL(file));
                                }
                            }}
                        />
                        {photoURL && (
                            <div className="image-preview">
                                <img src={photoURL} alt="Preview" />
                            </div>
                        )}
                        <div className="modal-actions">
                            <button type="submit" className="update-btn" disabled={updating}>
                                {updating ? <span className="loader"></span> : "Update"}
                            </button>
                            <button onClick={onClose} className="cancel-btn" type="button">
                                Cancel
                            </button>
                        </div>
                    </form>
                    {message && <p className="status-message">{message}</p>}
                </div>
            </div>
        </div>
    );
};

export default UpdateProfile;