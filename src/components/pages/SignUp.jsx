import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useState } from "react"
import { auth, db } from "../../firebaseConfig";
import "./signup.css";
import { doc, setDoc } from "firebase/firestore";
const SignUp = ({ onSwitch }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSignUp = async (e) => {
        e.preventDefault();
        try {
            // create auth user
       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            //   set user profile info
            await updateProfile(user, {
                displayName: name,
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
            });
            // create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: name,
                photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
            });

            alert("Account created successfully");
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="signup-container">
            <div className="signup-box">
                <h2 className="signup-title">Sign Up</h2>
                <form onSubmit={handleSignUp} className="signup-form">
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        className="signup-input"
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        className="signup-input"
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="password"
                        value={password}
                        className="signup-input"
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
                    <button type="submit"
                        className="signup-button">Sign Up</button>
                </form>
                <p className="switch-auth">
                    Already have an account? {" "}
                    <button onClick={onSwitch} className="switch-link">
                        Sign In</button>
                </p>
            </div>
        </div>
    );
};

export default SignUp;