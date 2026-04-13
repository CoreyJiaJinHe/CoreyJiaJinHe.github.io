
import { useEffect, useRef, useState } from 'react';
import './mycssv2.css';
import {
    checkLegacySessionOnLoad,
    clearLegacySessionStorageAndCookie,
    persistLegacySessionUser,
} from './LegacySessionContext';

const BACKEND_BASE_URL = "http://localhost/FinalsAssignment";

// Migrated from login.php
const ACCOUNT_USERNAMES = ["admin", "test", "12345", "CC"];
const ACCOUNT_PASSWORDS = ["password", "test", "12345", "Password123*"];

function LoginPage({ backendAvailable = false, onNavbarLoginStateChange }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showForgotHint, setShowForgotHint] = useState(false);
    const redirectIntervalRef = useRef(null);
    const redirectTimeoutRef = useRef(null);

    function clearRedirectTimers() {
        if (redirectIntervalRef.current) {
            clearInterval(redirectIntervalRef.current);
            redirectIntervalRef.current = null;
        }

        if (redirectTimeoutRef.current) {
            clearTimeout(redirectTimeoutRef.current);
            redirectTimeoutRef.current = null;
        }
    }

    useEffect(() => {
        const { user, expired } = checkLegacySessionOnLoad();
        if (user?.username) {
            setUsername(user.username);
            setIsLoggedIn(true);
            setStatusMessage("Welcome, " + user.username);
            onNavbarLoginStateChange?.({
                loginLabel: `Welcome,${user.username}`,
                isLoginDisabled: true,
            });
        } else if (expired) {
            setStatusMessage("Session expired. Please log in again.");
            setIsLoggedIn(false);
            onNavbarLoginStateChange?.({
                loginLabel: 'Login',
                isLoginDisabled: false,
            });
        }
        return () => {
            clearRedirectTimers();
        };
    }, [onNavbarLoginStateChange])








    // Migrated from login.html inline script: reveal the hint block.
    function showForgotPasswordHint() {
        setShowForgotHint(true);
    }

    // Migrated from login.html inline script + login.php account validation.
    async function handleLoginClick(event) {
        event.preventDefault();
        clearRedirectTimers();
        setStatusMessage("");

        if (!username || !password) {
            setStatusMessage("Please enter both username and password");
            return;
        }

        var id = username + "," + password;

        var isValid = false;
        var backendRequestFailed = false;

        if (backendAvailable) {
            try {
                var backendResponse = await fetch(`${BACKEND_BASE_URL}/login.php?id=${encodeURIComponent(id)}`, {
                    method: "POST"
                });

                if (backendResponse.ok) {
                    var backendText = (await backendResponse.text()).trim().toLowerCase();
                    isValid = backendText.includes("true");
                } else {
                    backendRequestFailed = true;
                }
            }
            catch (e) {
                backendRequestFailed = true;
            }
        }

        if (!backendAvailable || backendRequestFailed) {
            for (var i = 0; i < ACCOUNT_USERNAMES.length; i++) {
                if (username === ACCOUNT_USERNAMES[i] && password === ACCOUNT_PASSWORDS[i]) {
                    isValid = true;
                    break;
                }
            }
        }

        if (isValid) {
            document.cookie = "username=" + username;
            persistLegacySessionUser(username);
            setIsLoggedIn(true);
            onNavbarLoginStateChange?.({
                loginLabel: `Welcome,${username}`,
                isLoginDisabled: true,
            });
            var num = 5;

            redirectIntervalRef.current = setInterval(function () {
                num--;
                setStatusMessage("You are now logged in! Redirecting in..." + num);
                if (num <= 0) {
                    clearRedirectTimers();
                }
            }, 1000);

            redirectTimeoutRef.current = setTimeout(function () {
                setStatusMessage("Login successful.");
                clearRedirectTimers();
            }, 5000);
        } else {
            setStatusMessage("Invalid username or password");
            clearLegacySessionStorageAndCookie();
            setIsLoggedIn(false);
            onNavbarLoginStateChange?.({
                loginLabel: 'Login',
                isLoginDisabled: false,
            });
        }
    }



    return (
        <>
            <div className="loginbox">
                <form onSubmit={handleLoginClick}>
                    <p id="status">{statusMessage}</p>
                    <p>Username <input type="text" name="username" id="username" size="3" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </p>
                    <p>
                        Password <input type="password" name="password" id="password" size="3" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </p>
                    <button id="checkBtn" type="submit">Login</button>
                </form>
                <button id="forget" type="button" style={{ background: "none", border: "none" }} onClick={showForgotPasswordHint}>Forgot your password?</button>

            </div>

            <div id="hiddendiv" style={{ visibility: showForgotHint ? 'visible' : 'hidden' }}>
                <label>Username is:CC</label>
                <br></br>
                <label>Password is:Password123*</label>
            </div>
        </>
    )

}


export default LoginPage;