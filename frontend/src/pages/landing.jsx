import React, { useState } from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {

    const router = useNavigate();
    const [navOpen, setNavOpen] = useState(false);

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>Apna Video Call</h2>
                </div>

                {/* Hamburger toggle — visible only on small screens via CSS */}
                <button
                    className='navToggle'
                    aria-label="Toggle navigation"
                    aria-expanded={navOpen}
                    onClick={() => setNavOpen(prev => !prev)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div className={`navlist${navOpen ? ' navOpen' : ''}`}>
                    <p onClick={() => {
                        router("/aljk23")
                        setNavOpen(false)
                    }}>Join as Guest</p>
                    <p onClick={() => {
                        router("/auth")
                        setNavOpen(false)
                    }}>Register</p>
                    <p
                        onClick={() => {
                            router("/auth");
                            setNavOpen(false);
                        }}
                    >
                        Login
                    </p>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div>
                    <h1><span style={{ color: "#FF9839" }}>Connect</span> with your loved Ones</h1>

                    <p>Cover a distance by Apna Video Call</p>
                    <div role='button'>
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div>
                    <img src="/mobile.png" alt="App preview on mobile" />
                </div>
            </div>
        </div>
    )
}