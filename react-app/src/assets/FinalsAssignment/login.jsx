
import { useEffect, useRef, useState } from 'react';
import './mycssv2.css';

const BACKEND_BASE_URL = "http://localhost/OasisWorkshop";

// Migrated from login.php
const ACCOUNT_USERNAMES = ["admin", "test", "12345", "CC"];
const ACCOUNT_PASSWORDS = ["password", "test", "12345", "Password123*"];

// Migrated from products.php
const PRODUCT_NAMES = [
    "dining chair",
    "dining table",
    "office desk",
    "short bench",
    "long bench",
    "dresser",
    "drawer",
    "end table",
    "floor cabinet",
    "wall cabinet",
    "bedframe",
    "bed headboard",
    "flower stand"
];

function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showForgotHint, setShowForgotHint] = useState(false);
    const redirectIntervalRef = useRef(null);
    const redirectTimeoutRef = useRef(null);
    const [backendAvailable, setBackendAvailable] = useState(null);
    const [suggestions, setSuggestions] = useState([]);

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
        checkCookie();
        fetch(`${BACKEND_BASE_URL}/login.php?id=test,test`, { method: "GET" })
            .then((response) => setBackendAvailable(response.ok))
            .catch(() => setBackendAvailable(false));
        return () => {
            clearRedirectTimers();
        };
    }, [])

    function checkCookie() {
        let cookieUsername = getCookie("username");
        if (cookieUsername !== "") {
            setUsername(cookieUsername);
            setIsLoggedIn(true);
            setStatusMessage("Welcome, " + cookieUsername);
        }
    }
    function getCookie(cname) {
        let name = cname + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }


    async function getSuggestions(str) {
        var input = str || "";
        setSuggestions([]);
        if (input === "") {
            return;
        }
        if (backendAvailable) {
            try {
                var response = await fetch(`${BACKEND_BASE_URL}/products.php?input=${encodeURIComponent(input)}`, {
                    method: "GET"
                });

                if (response.ok) {
                    var text = (await response.text()).trim();
                    var backendSuggestions = text === "" ? [] : text.split(",");
                    setSuggestions(backendSuggestions.length ? backendSuggestions : ["No valid products"]);
                    return;
                }
            }
            catch (e) {
                // Fall back to in-memory suggestions when backend request fails.
                console.log(e);
            }
        }
        setSuggestions(buildSuggestionList(input));
    }

    function buildSuggestionList(input) {
        var pattern = new RegExp(input, "i");
        var matches = PRODUCT_NAMES.filter(function (name) {
            return pattern.test(name);
        });

        return matches.length === 0 ? ["No valid products"] : matches;
    }





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
            setIsLoggedIn(true);
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
        }
    }



    return (
        <>
            <div style={{ backgroundColor: "black" }}>
                <div className="header">
                    <div className="namebar">
                        <img src="Images/img_saw.png" alt="Image of Logo" style={{ float: "left", height: "120px", width: "120px", objectFit: "contain" }}></img>
                        <img src="Images/img_saw.png" alt="Image of Logo" style={{ float: "right", height: "120px", width: "120px", objectFit: "contain" }}></img>
                        <div style={{ color: "white", fontSize: "30px" }}>
                            <h1>Oasis Woodworks</h1>
                        </div>
                    </div>
                    <div style={{ backgroundColor: "white", width: "100%", height: "10px" }}>
                    </div>

                    <div style={{ paddingTop: "10px", paddingBottom: "10px", backgroundColor: "black", height: "25px" }}>
                        <div className="navbar">
                            <div className="dropdown">
                                <input list="suggestions" type="text" id="search" placeholder="Search" style={{ width: "164px" }} onKeyUp={(e) => getSuggestions(e.target.value)} />
                                <datalist id="suggestions">
                                    {suggestions.slice(0, 9).map((s, i) => <option key={i} value={s} />)}
                                </datalist>
                                <button type="button" onClick={() => getSuggestions(document.getElementById('search').value)} style={{ width: "5%", minWidth: "75px" }}>Search</button>


                                <button type="button" onClick={() => { window.location.href = 'HomePage.html'; }} className="button button1">Home Page </button>
                                <button id="ProductPage" onClick={() => { window.location.href = 'ProductPage.html'; }} className="button button1">Finished Wood</button>
                                <button type="button" onClick={() => { window.location.href = 'ErrorPage.html'; }} className="button button1">Furniture</button>
                                <button id="login" type="button" onClick={() => { window.location.href = 'login.html'; }} className="button button1" disabled={isLoggedIn}>{isLoggedIn ? `Welcome,${username}` : 'Login'}</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="content" style={{ height: "500px", border: "2px solid black" }}>
                    <div className="loginbox">
                        <form onSubmit={handleLoginClick}>
                            <p id="status">{statusMessage}</p>
                            <p>Username <input type="text" name="username" id="username" size="3" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
                            </p>
                            <br></br>
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
                </div>


                <div id="footer" style={{ marginLeft: "auto", marginRight: "auto", width: "1000px" }}>
                    <table className="footer">
                        <tbody>
                            <tr>
                                <td className="footer"><label><a href="ErrorPage.html">FAQ</a></label></td>
                                <td className="footer"><label><a href="ErrorPage.html">Support</a></label></td>
                                <td className="footer"><label><a href="ErrorPage.html">Contact Us</a></label></td>
                            </tr>
                            <tr>
                                <td className="footer"><label><a href="ErrorPage.html">Terms of Service</a></label></td>
                                <td className="footer"><label><a href="ErrorPage.html">Privacy Policy</a></label></td>
                                <td className="footer"><label><a href="ErrorPage.html">Cookie Policy</a></label></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )

}


export default LoginPage;