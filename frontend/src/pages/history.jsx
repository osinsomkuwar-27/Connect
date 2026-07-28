import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import { IconButton } from '@mui/material';
import "../App.css";

export default function History() {

    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch {
                // IMPLEMENT SNACKBAR
            }
        }
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    let formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`
    }

    return (
        <div className="historyContainer">
            <div className="historyHeader">
                <IconButton
                    onClick={() => routeTo("/home")}
                    aria-label="Back to home"
                >
                    <HomeIcon />
                </IconButton>
                <Typography variant="h6" component="h1">
                    Meeting History
                </Typography>
            </div>

            {meetings.length !== 0 ? (
                <div className="historyCardList">
                    {meetings.map((e, i) => (
                        <Card key={i} variant="outlined" sx={{ borderRadius: '10px' }}>
                            <CardContent>
                                <Typography
                                    sx={{ fontSize: '0.875rem', wordBreak: 'break-all' }}
                                    color="text.secondary"
                                    gutterBottom
                                >
                                    Code: {e.meetingCode}
                                </Typography>
                                <Typography sx={{ mb: 0.5 }} color="text.secondary">
                                    Date: {formatDate(e.date)}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="historyEmpty">
                    <p>No meeting history yet.</p>
                </div>
            )}
        </div>
    )
}