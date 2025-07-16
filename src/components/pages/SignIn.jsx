import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { auth, db, provider } from "../../firebaseConfig"
import { useState } from "react";
import "./signin.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
const SignIn = ({ onSwitch }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSignIn = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert(error.message);
        }
    };

    const signInWithGoogle = async() => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if Firestore user document exists
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // Create it
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || "Anonymous",
                    photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "User")}`,
                });
            }

            console.log("User signed in:", user);
        } catch (error) {
            console.log("Sign in error:", error);
            alert(error.message);

        }
    };

        return (
            <div className="signin-container">
                <div className="signin-box">
                    <h2 className="signin-title">Sign In</h2>
                    <form onSubmit={handleSignIn} className="signin-form">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            className="signin-input"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        /><br />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            className="signin-input"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <label>
                            <input
                                type="checkbox"
                                checked={showPassword}
                                onChange={() => setShowPassword(!showPassword)}
                            /> Show Password
                        </label>
                        <br />
                        <button type="submit" className="signin-button">Sign In</button>
                    </form>
                    <div className="google-section">
                        <p className="or-text">or</p>
                        <button onClick={signInWithGoogle} className="google-button">
                            <img
                                src="https://www.svgrepo.com/show/475656/google-color.svg"
                                alt="Google"
                                className="google-icon"
                            />
                            Sign In With GooGle </button>
                    </div>
                    <p className="switch-auth">Don't have an account? {" "}
                        <button onClick={onSwitch} className="switch-link">Sign Up</button></p>
                </div>
            </div>
        );
    };

    export default SignIn;