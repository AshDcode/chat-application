import { useEffect, useState } from 'react'
import { setUserOnlineStatus } from './components/layout/setUserOnlineStatus';
import { useAuthState } from "react-firebase-hooks/auth";
import './App.css'
import { auth } from './firebaseConfig'
import SignIn from './components/pages/SignIn';
import ChatRoom from './components/pages/ChatRoom';
import SignUp from './components/pages/SignUp';
import UpdateProfile from './components/pages/UpdateProfile';
import ChatList from './components/layout/ChatList';
import { signOut } from 'firebase/auth';
import PresenceManager from './components/layout/PresenceManager';

function App() {
  const [selectedUid, setSelectedUid] = useState(null);
  const [user] = useAuthState(auth);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const toggleAuthScreen = () => setIsSignUp((prev) => !prev);

  useEffect(() => {
    if (user) {
      setUserOnlineStatus(user);
    }
  }, [user]);

{/* <PresenceManager /> */}

  // show SignIn or SignUp when user is not logged in
  if (!user) {
    return (
      <div className='App'>
        {isSignUp ? (
          <SignUp onSwitch={toggleAuthScreen} />
        ) : (
          <SignIn onSwitch={toggleAuthScreen} />
        )}
      </div>
    );
  }

  //return Chat UI only when user is logged in
  return (
    <div className='App'>
      {/* <h1>Chat App</h1> */}
      <button onClick={() => signOut(auth)} className="btn-signout">Sign Out</button>
      <button className="open-modal-btn" onClick={() => setShowUpdateModal(true)}>
        Edit Profile
      </button>

      {showUpdateModal && (
        <UpdateProfile
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)} />
      )}
      <div className="chat-wrapper">
        <ChatList onSelectUser={(user) => {
          setSelectedUser(user);
          setSelectedUid(user.uid)
        }} />

        <ChatRoom selectedUid={selectedUid} selectedUser={selectedUser} />

        {/* {!user ? (
        isSignUp ? <SignUp onSwitch={toggleAuthScreen} /> : <SignIn onSwitch={toggleAuthScreen} />
      ) : (<ChatRoom />)} */}
      </div>
    </div>
  );
}

export default App;
