import { createContext, useContext, useEffect, useMemo, useState } from "react";
export const LegacySessionContext = createContext();
const LEGACY_USER_STORAGE_KEY = "legacyUser";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isSessionExpired(user) {
    if (!user?.loggedInAt) {
        return true;
    }

    return Date.now() - user.loggedInAt > SESSION_MAX_AGE_MS;
}

export function getLegacyCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

export function clearLegacySessionStorageAndCookie() {
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

export function persistLegacySessionUser(username) {
    localStorage.setItem(
        LEGACY_USER_STORAGE_KEY,
        JSON.stringify({ username, loggedInAt: Date.now() })
    );
}

export function readValidLegacySessionUser() {
    try {
        const storedUserRaw = localStorage.getItem(LEGACY_USER_STORAGE_KEY);
        if (!storedUserRaw) {
            return { user: null, expired: false };
        }

        const storedUser = JSON.parse(storedUserRaw);
        if (storedUser?.username && !isSessionExpired(storedUser)) {
            return { user: storedUser, expired: false };
        }

        clearLegacySessionStorageAndCookie();
        return { user: null, expired: true };
    }
    catch (error) {
        clearLegacySessionStorageAndCookie();
        return { user: null, expired: false };
    }
}

export function checkLegacySessionOnLoad() {
    const { user, expired } = readValidLegacySessionUser();
    if (user) {
        return { user, expired: false };
    }

    const cookieUsername = getLegacyCookie("username");
    if (cookieUsername !== "") {
        clearLegacySessionStorageAndCookie();
    }

    return { user: null, expired };
}

export const LegacySessionProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    const clearLegacyUser = () => {
        clearLegacySessionStorageAndCookie();
        setUser(null);
    };

    const setLegacyUser = (nextUser) => {
        if (!nextUser) {
            setUser(null);
            return;
        }

        const normalizedUser = {
            ...nextUser,
            loggedInAt: nextUser.loggedInAt ?? Date.now(),
        };

        setUser(normalizedUser);
    };

    useEffect(() => {
        const { user: checkedUser } = checkLegacySessionOnLoad();
        setUser(checkedUser);
    }, []);

    useEffect(() => {
        if (user) {
            localStorage.setItem(LEGACY_USER_STORAGE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
        }
    }, [user]);

    const isLoggedIn = Boolean(user);
    const value = useMemo(() => ({ user, setUser: setLegacyUser, setLegacyUser, clearLegacyUser, isLoggedIn }), [user, isLoggedIn]);


    return (
        <LegacySessionContext.Provider value={value}>
            {children}
        </LegacySessionContext.Provider>
    );
}

export function useLegacySession() {
    return useContext(LegacySessionContext);
}
