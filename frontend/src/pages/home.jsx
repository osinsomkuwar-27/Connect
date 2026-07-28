import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {

    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");

    const { addToUserHistory } = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        await addToUserHistory(meetingCode)
        navigate(`/${meetingCode}`)
    }

    return (
        <>
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <h2>Connect</h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                    <IconButton onClick={() => { navigate("/history") }} aria-label="Meeting history">
                        <RestoreIcon />
                    </IconButton>
                    <p>History</p>

                    <Button onClick={() => {
                        localStorage.removeItem("token")
                        navigate("/auth")
                    }}>
                        Logout
                    </Button>
                </div>
            </div>

            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h2>Providing Quality Video Call</h2>

                        <div className="meetInputRow">
                            <TextField
                                onChange={e => setMeetingCode(e.target.value)}
                                id="meeting-code"
                                label="Meeting Code"
                                variant="outlined"
                                size="small"
                            />
                            <Button
                                onClick={handleJoinVideoCall}
                                variant='contained'
                                sx={{ minWidth: '80px', height: '40px' }}
                            >
                                Join
                            </Button>
                        </div>
                    </div>
                </div>

                <div className='rightPanel'>
                    <img srcSet='/logo3.png' src='/logo3.png' alt="Connect app logo" />
                </div>
            </div>
        </>
    )
}

export default withAuth(HomeComponent)